"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAccess } from "@/lib/access";

export type StaffActionState = { error?: string; ok?: boolean } | null;

async function ownerRestaurantId(): Promise<string | null> {
  const access = await getAccess();
  return access?.isOwner ? access.restaurant.id : null;
}

// إنشاء حساب موظف جديد (بريد + كلمة مرور) وربطه بالمطعم والصلاحيات
export async function createStaff(
  _prev: StaffActionState,
  formData: FormData
): Promise<StaffActionState> {
  const rid = await ownerRestaurantId();
  if (!rid) return { error: "غير مصرح" };

  const full_name = String(formData.get("full_name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const role = String(formData.get("role") || "assistant");
  const sections = (formData.getAll("sections") as string[]).filter(Boolean);

  if (!email || password.length < 6) return { error: "بريد صحيح وكلمة مرور 6 أحرف على الأقل مطلوبان" };
  if (!["accountant", "chef", "assistant"].includes(role)) return { error: "دور غير صالح" };

  const admin = createAdminClient();
  const { data: created, error: userErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  });
  if (userErr || !created?.user) {
    return { error: userErr?.message?.includes("already") ? "البريد مستخدم بالفعل" : userErr?.message || "فشل إنشاء الحساب" };
  }

  const { error: staffErr } = await admin.from("staff").insert({
    restaurant_id: rid,
    user_id: created.user.id,
    role,
    sections,
  });
  if (staffErr) {
    // تراجع: احذف المستخدم إن فشل ربط الموظف
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: staffErr.message };
  }

  revalidatePath("/dashboard/staff");
  return { ok: true };
}

export async function updateStaff(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const rid = await ownerRestaurantId();
  if (!rid) return;
  const id = String(formData.get("id") || "");
  const role = String(formData.get("role") || "assistant");
  const sections = (formData.getAll("sections") as string[]).filter(Boolean);
  await supabase.from("staff").update({ role, sections }).eq("id", id).eq("restaurant_id", rid);
  revalidatePath("/dashboard/staff");
}

export async function deleteStaff(formData: FormData): Promise<void> {
  const rid = await ownerRestaurantId();
  if (!rid) return;
  const id = String(formData.get("id") || "");
  const user_id = String(formData.get("user_id") || "");
  const admin = createAdminClient();
  await admin.from("staff").delete().eq("id", id).eq("restaurant_id", rid);
  if (user_id) await admin.auth.admin.deleteUser(user_id).catch(() => {});
  revalidatePath("/dashboard/staff");
}
