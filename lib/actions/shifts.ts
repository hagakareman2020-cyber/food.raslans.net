"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMyRestaurant } from "@/lib/auth";

// إنشاء شيفت لفرع المالك (اسم + بداية + نهاية + سماح)
export async function createShift(formData: FormData) {
  const supabase = await createClient();
  const restaurant = await getMyRestaurant();
  if (!restaurant) return;

  const name = String(formData.get("name") || "").trim();
  const start_time = String(formData.get("start_time") || "") || null;
  const end_time = String(formData.get("end_time") || "") || null;
  const grace_minutes = Math.max(0, Math.min(120, Number(formData.get("grace_minutes") || 0)));
  if (!name) return;

  await supabase.from("shifts").insert({
    restaurant_id: restaurant.id,
    name,
    start_time,
    end_time,
    grace_minutes,
  });
  revalidatePath("/dashboard/attendance");
}

export async function deleteShift(formData: FormData) {
  const supabase = await createClient();
  const restaurant = await getMyRestaurant();
  if (!restaurant) return;
  const id = String(formData.get("id") || "");
  if (!id) return;
  await supabase.from("shifts").delete().eq("id", id).eq("restaurant_id", restaurant.id);
  revalidatePath("/dashboard/attendance");
}

// إسناد شيفت لموظف (أو إزالته بترك القيمة فارغة)
export async function assignStaffShift(formData: FormData) {
  const supabase = await createClient();
  const restaurant = await getMyRestaurant();
  if (!restaurant) return;
  const staff_id = String(formData.get("staff_id") || "");
  const shift_id = String(formData.get("shift_id") || "") || null;
  if (!staff_id) return;
  await supabase
    .from("staff")
    .update({ shift_id })
    .eq("id", staff_id)
    .eq("restaurant_id", restaurant.id);
  revalidatePath("/dashboard/attendance");
}
