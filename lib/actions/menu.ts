"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ProductTag } from "@/lib/types";

export type ActionState = { error?: string; ok?: boolean } | null;

// ===== الأقسام =====
export async function createCategory(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();
  const restaurant_id = String(formData.get("restaurant_id") || "");
  const name_ar = String(formData.get("name_ar") || "").trim();
  const name_en = String(formData.get("name_en") || "").trim() || null;
  if (!name_ar) return { error: "اسم القسم مطلوب" };

  const { error } = await supabase
    .from("categories")
    .insert({ restaurant_id, name_ar, name_en });
  if (error) return { error: error.message };
  revalidatePath("/dashboard/menu");
  return { ok: true };
}

export async function deleteCategory(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const id = String(formData.get("id") || "");
  await supabase.from("categories").delete().eq("id", id);
  revalidatePath("/dashboard/menu");
}

// ===== المنتجات =====
export async function createProduct(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();
  const restaurant_id = String(formData.get("restaurant_id") || "");
  const name_ar = String(formData.get("name_ar") || "").trim();
  if (!name_ar) return { error: "اسم المنتج مطلوب" };

  const tags = (formData.getAll("tags") as string[]).filter(Boolean) as ProductTag[];

  const { error } = await supabase.from("products").insert({
    restaurant_id,
    category_id: String(formData.get("category_id") || "") || null,
    name_ar,
    name_en: String(formData.get("name_en") || "").trim() || null,
    ingredients: String(formData.get("ingredients") || "").trim() || null,
    price: Number(formData.get("price") || 0),
    prep_minutes: Number(formData.get("prep_minutes") || 10),
    image_url: String(formData.get("image_url") || "") || null,
    tags,
  });
  if (error) return { error: error.message };
  revalidatePath("/dashboard/menu");
  return { ok: true };
}

export async function deleteProduct(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const id = String(formData.get("id") || "");
  await supabase.from("products").delete().eq("id", id);
  revalidatePath("/dashboard/menu");
}

export async function toggleProductAvailability(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const id = String(formData.get("id") || "");
  const value = String(formData.get("value") || "") === "true";
  await supabase.from("products").update({ is_available: value }).eq("id", id);
  revalidatePath("/dashboard/menu");
}

// ===== تطبيق منيو مُولّد بالذكاء الاصطناعي =====
type GeneratedMenu = {
  categories?: {
    name_ar: string;
    name_en?: string;
    items?: {
      name_ar: string;
      name_en?: string;
      ingredients?: string;
      suggested_price?: number;
      prep_minutes?: number;
      tags?: ProductTag[];
      image_url?: string | null;
    }[];
  }[];
};

// يعتمد نسخة مُولّدة: ينشئ أقسامها ومنتجاتها ويعلّمها كمعتمدة.
export async function applyMenuVersion(versionId: string): Promise<ActionState> {
  const supabase = await createClient();

  const { data: version } = await supabase
    .from("menu_versions")
    .select("*")
    .eq("id", versionId)
    .single();
  if (!version) return { error: "النسخة غير موجودة" };

  const restaurantId = version.restaurant_id as string;
  const content = version.content as GeneratedMenu;

  // ملاحظة: المنتجات موجودة بالفعل — لا ننشئ أي منتجات/أقسام جديدة (تجنّب التكرار).
  // نكتفي بحفظ الصور المجلوبة للمنتجات التي لا تملك صورة، ثم تعليم النسخة كمعتمدة.
  const imageByName = new Map<string, string>();
  for (const cat of content.categories ?? []) {
    for (const it of cat.items ?? []) {
      if (it.image_url && it.name_ar) imageByName.set(it.name_ar.trim(), it.image_url);
    }
  }

  const { data: prods } = await supabase
    .from("products")
    .select("id, name_ar, image_url")
    .eq("restaurant_id", restaurantId);
  for (const p of prods ?? []) {
    if (p.image_url) continue; // لا نطمس صورة المستخدم
    const url = imageByName.get(p.name_ar.trim());
    if (url) await supabase.from("products").update({ image_url: url }).eq("id", p.id);
  }

  // تعليم النسخة كمعتمدة (وإلغاء اعتماد الباقي)
  await supabase
    .from("menu_versions")
    .update({ is_approved: false })
    .eq("restaurant_id", restaurantId);
  await supabase.from("menu_versions").update({ is_approved: true }).eq("id", versionId);

  revalidatePath("/dashboard/menu");
  revalidatePath("/dashboard/generate");
  return { ok: true };
}
