"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMyRestaurant } from "@/lib/auth";
import { recomputeStock } from "@/lib/inventory";

export async function createInventoryItem(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const restaurant = await getMyRestaurant();
  if (!restaurant) return;
  const name = String(formData.get("name") || "").trim();
  if (!name) return;
  await supabase.from("inventory_items").insert({
    restaurant_id: restaurant.id,
    name,
    quantity: Number(formData.get("quantity") || 0),
    unit: String(formData.get("unit") || "وحدة"),
    low_threshold: Number(formData.get("low_threshold") || 0),
  });
  revalidatePath("/dashboard/inventory");
}

export async function updateInventoryQty(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const restaurant = await getMyRestaurant();
  if (!restaurant) return;
  const id = String(formData.get("id") || "");
  const quantity = Number(formData.get("quantity") || 0);
  await supabase.from("inventory_items").update({ quantity }).eq("id", id);
  await recomputeStock(supabase, restaurant.id);
  revalidatePath("/dashboard/inventory");
  revalidatePath("/dashboard/menu");
}

export async function deleteInventoryItem(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const id = String(formData.get("id") || "");
  await supabase.from("inventory_items").delete().eq("id", id);
  revalidatePath("/dashboard/inventory");
}

// ربط منتج بخامة من المخزون (الكمية المستهلكة لكل وحدة)
export async function linkIngredient(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const restaurant = await getMyRestaurant();
  if (!restaurant) return;
  const product_id = String(formData.get("product_id") || "");
  const inventory_item_id = String(formData.get("inventory_item_id") || "");
  const amount = Number(formData.get("amount") || 0);
  if (!product_id || !inventory_item_id) return;
  await supabase
    .from("product_ingredients")
    .upsert({ product_id, inventory_item_id, amount }, { onConflict: "product_id,inventory_item_id" });
  await recomputeStock(supabase, restaurant.id);
  revalidatePath("/dashboard/inventory");
  revalidatePath("/dashboard/menu");
}

export async function unlinkIngredient(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const restaurant = await getMyRestaurant();
  const product_id = String(formData.get("product_id") || "");
  const inventory_item_id = String(formData.get("inventory_item_id") || "");
  await supabase
    .from("product_ingredients")
    .delete()
    .eq("product_id", product_id)
    .eq("inventory_item_id", inventory_item_id);
  if (restaurant) await recomputeStock(supabase, restaurant.id);
  revalidatePath("/dashboard/inventory");
  revalidatePath("/dashboard/menu");
}
