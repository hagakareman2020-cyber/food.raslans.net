"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveRestaurant } from "@/lib/auth";

export type AttendanceState = { error?: string; ok?: boolean } | null;

// يوم العمل بتوقيت القاهرة (YYYY-MM-DD) حتى لا يختلط التاريخ قرب منتصف الليل
function cairoWorkDate(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo" }).format(d);
}

// تسجيل الحضور للموظف الحالي في الفرع النشِط
export async function checkIn(): Promise<AttendanceState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "غير مصرح" };

  const restaurant = await getActiveRestaurant();
  if (!restaurant) return { error: "لا يوجد فرع" };

  const work_date = cairoWorkDate();
  const { data: prof } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();
  const user_name = prof?.full_name || user.email || "موظف";

  const { data: existing } = await supabase
    .from("attendance")
    .select("id, check_in_at")
    .eq("restaurant_id", restaurant.id)
    .eq("user_id", user.id)
    .eq("work_date", work_date)
    .maybeSingle();

  if (existing?.check_in_at) return { error: "سجّلت حضورك بالفعل اليوم" };

  if (existing) {
    const { error } = await supabase
      .from("attendance")
      .update({ check_in_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("attendance").insert({
      restaurant_id: restaurant.id,
      user_id: user.id,
      user_name,
      work_date,
      check_in_at: new Date().toISOString(),
    });
    if (error) return { error: error.message };
  }

  revalidatePath("/dashboard/attendance");
  return { ok: true };
}

// تسجيل الانصراف + حساب دقائق العمل
export async function checkOut(): Promise<AttendanceState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "غير مصرح" };

  const restaurant = await getActiveRestaurant();
  if (!restaurant) return { error: "لا يوجد فرع" };

  const work_date = cairoWorkDate();
  const { data: row } = await supabase
    .from("attendance")
    .select("id, check_in_at, check_out_at")
    .eq("restaurant_id", restaurant.id)
    .eq("user_id", user.id)
    .eq("work_date", work_date)
    .maybeSingle();

  if (!row?.check_in_at) return { error: "سجّل حضورك أولاً" };
  if (row.check_out_at) return { error: "سجّلت انصرافك بالفعل" };

  const now = new Date();
  const worked = Math.max(0, Math.round((now.getTime() - new Date(row.check_in_at).getTime()) / 60000));
  const { error } = await supabase
    .from("attendance")
    .update({ check_out_at: now.toISOString(), worked_minutes: worked })
    .eq("id", row.id);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/attendance");
  return { ok: true };
}
