"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMyRestaurant } from "@/lib/auth";

// إضافة معاملة راتب يدوية (مكافأة/بدل/خصم/أخرى) لموظف
export async function addPayrollTransaction(formData: FormData) {
  const supabase = await createClient();
  const restaurant = await getMyRestaurant();
  if (!restaurant) return;

  const staff_id = String(formData.get("staff_id") || "");
  const kind = String(formData.get("kind") || "bonus");
  const ref_date = String(formData.get("ref_date") || "");
  const note = String(formData.get("note") || "").trim() || null;
  const raw = Math.abs(Number(formData.get("amount") || 0));
  if (!staff_id || !raw || !ref_date) return;
  if (!["bonus", "allowance", "deduction", "other"].includes(kind)) return;

  const amount = kind === "deduction" ? -raw : raw;
  await supabase.from("payroll_transactions").insert({
    restaurant_id: restaurant.id,
    staff_id,
    kind,
    amount,
    ref_date,
    note,
  });
  revalidatePath("/dashboard/payroll");
}

export async function deletePayrollTransaction(formData: FormData) {
  const supabase = await createClient();
  const restaurant = await getMyRestaurant();
  if (!restaurant) return;
  const id = String(formData.get("id") || "");
  if (!id) return;
  await supabase.from("payroll_transactions").delete().eq("id", id).eq("restaurant_id", restaurant.id);
  revalidatePath("/dashboard/payroll");
}
