"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyRestaurant } from "@/lib/auth";

function slugify(name: string) {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return `${base || "restaurant"}-${Math.random().toString(36).slice(2, 7)}`;
}

export type ActionState = { error?: string; ok?: boolean } | null;

export async function createRestaurant(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = String(formData.get("name") || "").trim();
  const currency = String(formData.get("currency") || "EGP");
  const logo_url = String(formData.get("logo_url") || "") || null;
  const bt = String(formData.get("business_type") || "restaurant");
  const business_type = (["restaurant", "cafe", "both"].includes(bt) ? bt : "restaurant") as
    | "restaurant"
    | "cafe"
    | "both";
  if (!name) return { error: "اسم النشاط مطلوب" };

  const { error } = await supabase.from("restaurants").insert({
    owner_id: user.id,
    name,
    currency,
    logo_url,
    slug: slugify(name),
    settings: { free_water_bottles: 2, languages: ["ar", "en"], business_type },
    status: "pending", // بانتظار موافقة الأدمن
  });
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

// حفظ منيو PDF مرفوع كمنيو معتمد للمطعم (يُخزَّن الرابط داخل settings)
export async function setPdfMenu(url: string): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "غير مصرح" };

  const restaurant = await getMyRestaurant();
  if (!restaurant) return { error: "لا يوجد مطعم" };

  const settings = {
    ...(restaurant.settings as Record<string, unknown>),
    menu_pdf_url: url,
    menu_source: "pdf",
  };
  const { error } = await supabase
    .from("restaurants")
    .update({ settings })
    .eq("id", restaurant.id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/generate");
  return { ok: true };
}

// إزالة منيو الـ PDF والعودة للمنيو المُولّد
export async function clearPdfMenu(): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "غير مصرح" };

  const restaurant = await getMyRestaurant();
  if (!restaurant) return { error: "لا يوجد مطعم" };

  const settings = { ...(restaurant.settings as Record<string, unknown>) };
  delete settings.menu_pdf_url;
  settings.menu_source = "generated";
  const { error } = await supabase
    .from("restaurants")
    .update({ settings })
    .eq("id", restaurant.id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/generate");
  return { ok: true };
}

// ضبط سعر وعدد زجاجات المياه المضافة تلقائياً
export async function updateWaterSettings(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const restaurant = await getMyRestaurant();
  if (!restaurant) return;

  const bottles = Math.max(0, Math.min(10, Number(formData.get("water_bottles") || 0)));
  const price = Math.max(0, Number(formData.get("water_price") || 0));
  const settings = {
    ...(restaurant.settings as Record<string, unknown>),
    water_bottles: bottles,
    water_price: price,
  };
  await supabase.from("restaurants").update({ settings }).eq("id", restaurant.id);
  revalidatePath("/dashboard/settings");
}

// تعديل بيانات النشاط: الاسم، العملة، ونوع النشاط (مطعم/كافيه/الاثنين)
export async function updateBusinessSettings(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const restaurant = await getMyRestaurant();
  if (!restaurant) return;

  const bt = String(formData.get("business_type") || "restaurant");
  const business_type = ["restaurant", "cafe", "both"].includes(bt) ? bt : "restaurant";
  const patch: Record<string, unknown> = {
    settings: { ...(restaurant.settings as Record<string, unknown>), business_type },
  };
  const name = String(formData.get("name") || "").trim();
  const currency = String(formData.get("currency") || "").trim();
  if (name) patch.name = name;
  if (currency) patch.currency = currency;

  await supabase.from("restaurants").update(patch).eq("id", restaurant.id);
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
}

export async function updateRestaurant(id: string, formData: FormData) {
  const supabase = await createClient();
  const patch: Record<string, unknown> = {};
  const name = formData.get("name");
  const currency = formData.get("currency");
  const logo_url = formData.get("logo_url");
  if (name != null) patch.name = String(name).trim();
  if (currency != null) patch.currency = String(currency);
  if (logo_url != null) patch.logo_url = String(logo_url) || null;

  const { error } = await supabase.from("restaurants").update(patch).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { ok: true };
}
