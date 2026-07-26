"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMyRestaurant } from "@/lib/auth";

// تحديد كل تنبيهات الفرع كمقروءة (للمالك)
export async function markAllNotificationsRead() {
  const supabase = await createClient();
  const restaurant = await getMyRestaurant();
  if (!restaurant) return;
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("restaurant_id", restaurant.id)
    .eq("is_read", false);
  revalidatePath("/dashboard/attendance");
}
