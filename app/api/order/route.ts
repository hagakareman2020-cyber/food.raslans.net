import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { waterConfig } from "@/lib/water";
import { consumeInventory } from "@/lib/inventory";

type IncomingItem = { product_id: string; quantity: number; note?: string };

export async function POST(req: Request) {
  const admin = createAdminClient();
  let body: { token?: string; items?: IncomingItem[]; note?: string; session_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const token = String(body.token || "");
  const items = Array.isArray(body.items) ? body.items : [];
  if (!token || items.length === 0) {
    return NextResponse.json({ error: "السلة فارغة" }, { status: 400 });
  }

  // التحقق من الترابيزة
  const { data: table } = await admin
    .from("restaurant_tables")
    .select("id, restaurant_id, table_number")
    .eq("qr_token", token)
    .maybeSingle();
  if (!table) return NextResponse.json({ error: "ترابيزة غير معروفة" }, { status: 404 });

  // التحقق من المطعم (مفعّل)
  const { data: restaurant } = await admin
    .from("restaurants")
    .select("id, status, settings")
    .eq("id", table.restaurant_id)
    .maybeSingle();
  if (!restaurant || restaurant.status !== "active") {
    return NextResponse.json({ error: "المطعم غير متاح حالياً" }, { status: 403 });
  }

  // جلب المنتجات الحقيقية والتحقق من التوفر والأسعار
  const ids = items.map((i) => i.product_id);
  const { data: products } = await admin
    .from("products")
    .select("id, name_ar, price, prep_minutes, is_available, in_stock")
    .eq("restaurant_id", table.restaurant_id)
    .in("id", ids);
  const prodMap = new Map((products ?? []).map((p) => [p.id, p]));

  const orderItems: {
    product_id: string;
    name_ar: string;
    price: number;
    quantity: number;
    note: string | null;
    is_free: boolean;
  }[] = [];
  let total = 0;
  let eta = 0;

  for (const it of items) {
    const p = prodMap.get(it.product_id);
    if (!p || !p.is_available || !p.in_stock) continue;
    const qty = Math.max(1, Math.min(50, Number(it.quantity) || 1));
    total += Number(p.price) * qty;
    eta = Math.max(eta, p.prep_minutes);
    orderItems.push({
      product_id: p.id,
      name_ar: p.name_ar,
      price: Number(p.price),
      quantity: qty,
      note: it.note ? String(it.note).slice(0, 200) : null,
      is_free: false,
    });
  }

  if (orderItems.length === 0) {
    return NextResponse.json({ error: "لا توجد منتجات متاحة في السلة" }, { status: 400 });
  }

  // زجاجات المياه المضافة تلقائياً (بسعرها إن وُجد)
  const water = waterConfig(restaurant.settings);
  if (water.bottles > 0) {
    total += water.price * water.bottles;
    orderItems.push({
      product_id: "",
      name_ar: water.price > 0 ? "زجاجة مياه" : "زجاجة مياه (مجانية)",
      price: water.price,
      quantity: water.bottles,
      note: null,
      is_free: water.price === 0,
    });
  }

  // إنشاء الطلب
  const { data: order, error: orderErr } = await admin
    .from("orders")
    .insert({
      restaurant_id: table.restaurant_id,
      table_id: table.id,
      table_number: table.table_number,
      status: "received",
      total,
      eta_minutes: eta || 15,
      session_id: body.session_id ? String(body.session_id).slice(0, 64) : null,
      note: body.note ? String(body.note).slice(0, 300) : null,
    })
    .select("id")
    .single();
  if (orderErr || !order) {
    return NextResponse.json({ error: orderErr?.message || "فشل إنشاء الطلب" }, { status: 500 });
  }

  const rows = orderItems.map((oi) => ({
    order_id: order.id,
    product_id: oi.product_id || null,
    name_ar: oi.name_ar,
    price: oi.price,
    quantity: oi.quantity,
    note: oi.note,
    is_free: oi.is_free,
  }));
  await admin.from("order_items").insert(rows);

  // خصم المخزون وإخفاء الأطباق التي نفدت خاماتها
  await consumeInventory(
    admin,
    table.restaurant_id,
    orderItems.filter((o) => o.product_id && !o.is_free).map((o) => ({ product_id: o.product_id, quantity: o.quantity }))
  );

  return NextResponse.json({ orderId: order.id, eta: eta || 15 });
}
