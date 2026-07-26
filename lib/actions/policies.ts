"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMyRestaurant } from "@/lib/auth";

// إنشاء سياسة (تأخير أو أوفرتايم) لفرع المالك
export async function createPolicy(formData: FormData) {
  const supabase = await createClient();
  const restaurant = await getMyRestaurant();
  if (!restaurant) return;
  const name = String(formData.get("name") || "").trim();
  const kind = String(formData.get("kind") || "late");
  if (!name || !["late", "overtime"].includes(kind)) return;
  await supabase.from("policies").insert({ restaurant_id: restaurant.id, name, kind });
  revalidatePath("/dashboard/policies");
}

export async function deletePolicy(formData: FormData) {
  const supabase = await createClient();
  const restaurant = await getMyRestaurant();
  if (!restaurant) return;
  const id = String(formData.get("id") || "");
  if (!id) return;
  await supabase.from("policies").delete().eq("id", id).eq("restaurant_id", restaurant.id);
  revalidatePath("/dashboard/policies");
}

// جعل سياسة هي الافتراضية لنوعها (تُطبَّق تلقائياً على من ليس له سياسة)
export async function setDefaultPolicy(formData: FormData) {
  const supabase = await createClient();
  const restaurant = await getMyRestaurant();
  if (!restaurant) return;
  const id = String(formData.get("id") || "");
  const kind = String(formData.get("kind") || "late");
  if (!id) return;
  // صفّر الافتراضي لنفس النوع ثم عيّن الجديد
  await supabase
    .from("policies")
    .update({ is_default: false })
    .eq("restaurant_id", restaurant.id)
    .eq("kind", kind);
  await supabase.from("policies").update({ is_default: true }).eq("id", id).eq("restaurant_id", restaurant.id);
  revalidatePath("/dashboard/policies");
}

// إضافة قاعدة (شريحة) لسياسة
export async function addPolicyRule(formData: FormData) {
  const supabase = await createClient();
  const restaurant = await getMyRestaurant();
  if (!restaurant) return;
  const policy_id = String(formData.get("policy_id") || "");
  if (!policy_id) return;
  // تحقّق أن السياسة تخصّ فرع المالك
  const { data: pol } = await supabase
    .from("policies")
    .select("id")
    .eq("id", policy_id)
    .eq("restaurant_id", restaurant.id)
    .maybeSingle();
  if (!pol) return;

  const from_value = Number(formData.get("from_value") || 0);
  const toRaw = String(formData.get("to_value") || "").trim();
  const to_value = toRaw ? Number(toRaw) : null;
  const action = String(formData.get("action") || "alert");
  const amountRaw = String(formData.get("amount") || "").trim();
  const amount = amountRaw ? Number(amountRaw) : null;

  await supabase.from("policy_rules").insert({ policy_id, from_value, to_value, action, amount });
  revalidatePath("/dashboard/policies");
}

export async function deletePolicyRule(formData: FormData) {
  const supabase = await createClient();
  const restaurant = await getMyRestaurant();
  if (!restaurant) return;
  const id = String(formData.get("id") || "");
  if (!id) return;
  // RLS يضمن أنها ضمن سياسات المالك
  await supabase.from("policy_rules").delete().eq("id", id);
  revalidatePath("/dashboard/policies");
}
