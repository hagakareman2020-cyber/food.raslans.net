// مساعدات المصادقة على السيرفر
import { createClient } from "@/lib/supabase/server";
import { resolveActiveOwned } from "@/lib/branch";
import type { Restaurant } from "@/lib/types";

// المستخدم الحالي أو null
export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// مطعم المستخدم الحالي (كمالك) = الفرع النشِط المختار من الكوكي.
export async function getMyRestaurant(): Promise<Restaurant | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("restaurants")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true });

  return (await resolveActiveOwned((data as Restaurant[]) ?? [])) ?? null;
}

// المطعم الذي ينتمي إليه المستخدم كمالك أو كموظف
export async function getActiveRestaurant(): Promise<Restaurant | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: owned } = await supabase
    .from("restaurants")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true });
  if (owned && owned.length > 0) {
    return (await resolveActiveOwned(owned as Restaurant[])) ?? null;
  }

  const { data: staff } = await supabase
    .from("staff")
    .select("restaurant_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!staff) return null;

  const { data } = await supabase
    .from("restaurants")
    .select("*")
    .eq("id", staff.restaurant_id)
    .maybeSingle();
  return (data as Restaurant) ?? null;
}
