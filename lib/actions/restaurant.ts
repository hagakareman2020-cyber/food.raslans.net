"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
  if (!name) return { error: "اسم المطعم مطلوب" };

  const { error } = await supabase.from("restaurants").insert({
    owner_id: user.id,
    name,
    currency,
    logo_url,
    slug: slugify(name),
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

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, settings")
    .eq("owner_id", user.id)
    .limit(1)
    .maybeSingle();
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

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, settings")
    .eq("owner_id", user.id)
    .limit(1)
    .maybeSingle();
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
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, settings")
    .eq("owner_id", user.id)
    .limit(1)
    .maybeSingle();
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
