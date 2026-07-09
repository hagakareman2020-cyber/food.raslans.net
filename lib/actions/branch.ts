"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_BRANCH_COOKIE } from "@/lib/branch";

export type BranchState = { error?: string; ok?: boolean } | null;

const COOKIE_OPTS = { path: "/", maxAge: 60 * 60 * 24 * 365 } as const;

function slugify(name: string) {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return `${base || "branch"}-${Math.random().toString(36).slice(2, 7)}`;
}

// إنشاء فرع جديد (= مطعم مستقل بنفس المالك) وتفعيله كفرع نشِط.
export async function createBranch(
  _prev: BranchState,
  formData: FormData
): Promise<BranchState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "غير مصرح" };

  const name = String(formData.get("name") || "").trim();
  const currency = String(formData.get("currency") || "EGP");
  const logo_url = String(formData.get("logo_url") || "") || null;
  if (!name) return { error: "اسم الفرع مطلوب" };

  // لو المالك عنده فرع مفعّل بالفعل، الفرع الجديد يُفعّل مباشرة؛ وإلا ينتظر موافقة الأدمن.
  const { data: existingActive } = await supabase
    .from("restaurants")
    .select("id")
    .eq("owner_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  const status = existingActive ? "active" : "pending";

  const { data: created, error } = await supabase
    .from("restaurants")
    .insert({
      owner_id: user.id,
      name,
      currency,
      logo_url,
      slug: slugify(name),
      status,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  const store = await cookies();
  store.set(ACTIVE_BRANCH_COOKIE, created.id, COOKIE_OPTS);
  revalidatePath("/dashboard", "layout");
  redirect("/dashboard");
}

// تبديل الفرع النشِط (بعد التحقق من ملكيته).
export async function switchBranch(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const id = String(formData.get("branch_id") || "");
  if (!id) return;

  const { data: owned } = await supabase
    .from("restaurants")
    .select("id")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!owned) return;

  const store = await cookies();
  store.set(ACTIVE_BRANCH_COOKIE, id, COOKIE_OPTS);
  revalidatePath("/dashboard", "layout");
  redirect("/dashboard");
}
