// مساعدات المصادقة على السيرفر
import { createClient } from "@/lib/supabase/server";
import type { Restaurant } from "@/lib/types";

// المستخدم الحالي أو null
export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// مطعم المستخدم الحالي (كمالك). Phase 1: مطعم واحد لكل مالك.
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
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return (data as Restaurant) ?? null;
}

// المطعم الذي ينتمي إليه المستخدم كمالك أو كموظف
export async function getActiveRestaurant(): Promise<Restaurant | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const owned = await supabase
    .from("restaurants")
    .select("*")
    .eq("owner_id", user.id)
    .limit(1)
    .maybeSingle();
  if (owned.data) return owned.data as Restaurant;

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
