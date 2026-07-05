// نظام الصلاحيات: المالك يرى كل شيء، والموظف يرى الأقسام المصرّح بها فقط
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Restaurant } from "@/lib/types";

export const SECTIONS = {
  menu: "المنيو",
  pos: "الكاشير (POS)",
  kitchen: "المطبخ",
  tables: "الترابيزات و QR",
  analytics: "المحاسبة والتحليل",
  inventory: "المخزون",
} as const;

export type SectionKey = keyof typeof SECTIONS;

export type Access = {
  user: User;
  restaurant: Restaurant;
  isOwner: boolean;
  sections: Set<string>;
};

export async function getAccess(): Promise<Access | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // مالك
  const { data: owned } = await supabase
    .from("restaurants")
    .select("*")
    .eq("owner_id", user.id)
    .limit(1)
    .maybeSingle();
  if (owned) {
    return { user, restaurant: owned as Restaurant, isOwner: true, sections: new Set(Object.keys(SECTIONS)) };
  }

  // موظف
  const { data: staff } = await supabase
    .from("staff")
    .select("restaurant_id, sections")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!staff) return null;

  const { data: r } = await supabase
    .from("restaurants")
    .select("*")
    .eq("id", staff.restaurant_id)
    .maybeSingle();
  if (!r) return null;

  return {
    user,
    restaurant: r as Restaurant,
    isOwner: false,
    sections: new Set((staff.sections as string[]) ?? []),
  };
}

export function can(access: Access, section: SectionKey): boolean {
  return access.isOwner || access.sections.has(section);
}

// يتطلّب صلاحية قسم معيّن — يعيد المطعم أو يوجّه بعيداً
export async function requireAccess(section: SectionKey): Promise<Restaurant> {
  const access = await getAccess();
  if (!access) redirect("/dashboard");
  if (!can(access, section)) redirect("/dashboard");
  return access.restaurant;
}

// يتطلّب أن يكون المستخدم مالكاً
export async function requireOwner(): Promise<Restaurant> {
  const access = await getAccess();
  if (!access || !access.isOwner) redirect("/dashboard");
  return access.restaurant;
}
