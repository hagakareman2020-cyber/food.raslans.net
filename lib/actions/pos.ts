"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveRestaurant } from "@/lib/auth";
import { waterConfig } from "@/lib/water";
import { consumeInventory } from "@/lib/inventory";

export type PosResult = { orderId?: string; total?: number; error?: string };

// إنشاء طلب من الكاشير (POS) — يصل للمطبخ فوراً عبر Realtime
export async function createPosOrder(payload: {
  items: { product_id: string; quantity: number }[];
  customItems?: { name: string; price: number; quantity: number }[]; // أصناف مخصّصة (بصل زيادة… إلخ)
  tableNumber: number | null; // null = تيك أواي
  note?: string;
}): Promise<PosResult> {
  const supabase = await createClient();
  const restaurant = await getActiveRestaurant();
  if (!restaurant) return { error: "غير مصرح" };

  const items = Array.isArray(payload.items) ? payload.items : [];
  const customItems = Array.isArray(payload.customItems) ? payload.customItems : [];
  if (items.length === 0 && customItems.length === 0) return { error: "السلة فارغة" };

  const ids = items.map((i) => i.product_id);
  const { data: products } = await supabase
    .from("products")
    .select("id, name_ar, price, prep_minutes, is_available, in_stock")
    .eq("restaurant_id", restaurant.id)
    .in("id", ids);
  const prodMap = new Map((products ?? []).map((p) => [p.id, p]));

  const rows: {
    product_id: string | null;
    name_ar: string;
    price: number;
    quantity: number;
    is_free: boolean;
  }[] = [];
  let total = 0;
  let eta = 0;

  for (const it of items) {
    const p = prodMap.get(it.product_id);
    if (!p || !p.is_available || !p.in_stock) continue;
    const qty = Math.max(1, Math.min(99, Number(it.quantity) || 1));
    total += Number(p.price) * qty;
    eta = Math.max(eta, p.prep_minutes);
    rows.push({ product_id: p.id, name_ar: p.name_ar, price: Number(p.price), quantity: qty, is_free: false });
  }

  // أصناف مخصّصة يكتبها الكاشير بسعر يدوي (بدون product_id ولا خصم مخزون)
  for (const ci of customItems) {
    const name = String(ci.name || "").trim().slice(0, 100);
    const price = Math.max(0, Number(ci.price) || 0);
    const qty = Math.max(1, Math.min(99, Number(ci.quantity) || 1));
    if (!name) continue;
    total += price * qty;
    rows.push({ product_id: null, name_ar: name, price, quantity: qty, is_free: false });
  }

  if (rows.length === 0) return { error: "لا توجد منتجات متاحة" };

  // مياه تُضاف تلقائياً (بسعرها إن وُجد)
  const water = waterConfig(restaurant.settings);
  if (water.bottles > 0) {
    total += water.price * water.bottles;
    rows.push({
      product_id: null,
      name_ar: water.price > 0 ? "زجاجة مياه" : "زجاجة مياه (مجانية)",
      price: water.price,
      quantity: water.bottles,
      is_free: water.price === 0,
    });
  }

  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      restaurant_id: restaurant.id,
      table_id: null,
      table_number: payload.tableNumber,
      status: "received",
      total,
      eta_minutes: eta || 15,
      note: payload.note ? String(payload.note).slice(0, 300) : "طلب كاشير",
    })
    .select("id")
    .single();
  if (error || !order) return { error: error?.message || "فشل إنشاء الطلب" };

  await supabase.from("order_items").insert(rows.map((r) => ({ ...r, order_id: order.id })));

  // خصم المخزون
  await consumeInventory(
    supabase,
    restaurant.id,
    rows.filter((r) => r.product_id && !r.is_free).map((r) => ({ product_id: r.product_id as string, quantity: r.quantity }))
  );

  revalidatePath("/dashboard/kitchen");
  return { orderId: order.id, total };
}
