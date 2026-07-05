"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSuperAdmin } from "@/lib/admin";

// يتحقق أن المستخدم الحالي أدمن رئيسي، ويعيد admin client (يتجاوز RLS)
async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isSuperAdmin(user)) throw new Error("غير مصرح");
  return createAdminClient();
}

async function setStatus(id: string, status: string) {
  const admin = await requireAdmin();
  const { error } = await admin
    .from("restaurants")
    .update({ status })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function approveRestaurant(formData: FormData) {
  await setStatus(String(formData.get("id") || ""), "active");
}

export async function suspendRestaurant(formData: FormData) {
  await setStatus(String(formData.get("id") || ""), "suspended");
}

export async function rejectRestaurant(formData: FormData) {
  await setStatus(String(formData.get("id") || ""), "rejected");
}
