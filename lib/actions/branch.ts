"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ACTIVE_BRANCH_COOKIE } from "@/lib/branch";

/* eslint-disable @typescript-eslint/no-explicit-any */

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

// ينسخ منيو فرع (الأقسام + المنتجات) إلى فرع جديد. لا ينسخ روابط المخزون (المخزون لكل فرع مستقل).
async function copyMenu(admin: any, fromId: string, toId: string) {
  const { data: cats } = await admin
    .from("categories")
    .select("id, name_ar, name_en, sort_order")
    .eq("restaurant_id", fromId)
    .order("sort_order", { ascending: true });

  const catMap = new Map<string, string>();
  for (const c of cats ?? []) {
    const { data: nc } = await admin
      .from("categories")
      .insert({ restaurant_id: toId, name_ar: c.name_ar, name_en: c.name_en, sort_order: c.sort_order })
      .select("id")
      .single();
    if (nc) catMap.set(c.id, nc.id);
  }

  const { data: prods } = await admin
    .from("products")
    .select("*")
    .eq("restaurant_id", fromId)
    .order("sort_order", { ascending: true });

  const rows = (prods ?? []).map((p: any) => ({
    restaurant_id: toId,
    category_id: p.category_id ? catMap.get(p.category_id) ?? null : null,
    name_ar: p.name_ar,
    name_en: p.name_en,
    ingredients: p.ingredients,
    price: p.price,
    image_url: p.image_url,
    prep_minutes: p.prep_minutes,
    tags: p.tags,
    is_available: p.is_available,
    in_stock: true,
    sort_order: p.sort_order,
  }));
  if (rows.length) await admin.from("products").insert(rows);
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
  const address = String(formData.get("address") || "").trim();
  const currency = String(formData.get("currency") || "EGP");
  const logo_url = String(formData.get("logo_url") || "") || null;
  const menuMode = String(formData.get("menu_mode") || "new"); // same | new
  const sourceBranchId = String(formData.get("source_branch_id") || "");
  if (!name) return { error: "اسم الفرع مطلوب" };

  // نستخدم العميل المصرّح (service_role) بعد التأكد من هوية المالك — يتجاوز قيود RLS بأمان.
  const admin = createAdminClient();

  // الفرع الجديد يُفعّل فوراً لو للمالك فرع مفعّل بالفعل؛ وإلا ينتظر موافقة الأدمن.
  const { data: existingActive } = await admin
    .from("restaurants")
    .select("id")
    .eq("owner_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  const status = existingActive ? "active" : "pending";

  const settings: Record<string, unknown> = { free_water_bottles: 2, languages: ["ar", "en"] };
  if (address) settings.address = address;

  const { data: created, error } = await admin
    .from("restaurants")
    .insert({ owner_id: user.id, name, currency, logo_url, slug: slugify(name), status, settings })
    .select("id")
    .single();
  if (error) return { error: error.message };

  // نسخ المنيو من فرع موجود (يخص نفس المالك فقط)
  if (menuMode === "same" && sourceBranchId) {
    const { data: src } = await admin
      .from("restaurants")
      .select("id")
      .eq("id", sourceBranchId)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (src) await copyMenu(admin, sourceBranchId, created.id);
  }

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

  const admin = createAdminClient();
  const { data: owned } = await admin
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
