"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function myRestaurantId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("restaurants")
    .select("id")
    .eq("owner_id", user.id)
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

// إضافة ترابيزة واحدة أو أكثر بأرقام تلقائية متتالية
export async function addTables(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const rid = await myRestaurantId();
  if (!rid) return;

  const count = Math.max(1, Math.min(50, Number(formData.get("count") || 1)));

  // أعلى رقم ترابيزة حالي
  const { data: existing } = await supabase
    .from("restaurant_tables")
    .select("table_number")
    .eq("restaurant_id", rid)
    .order("table_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  let next = (existing?.table_number ?? 0) + 1;
  const rows = Array.from({ length: count }, () => ({
    restaurant_id: rid,
    table_number: next++,
  }));

  await supabase.from("restaurant_tables").insert(rows);
  revalidatePath("/dashboard/tables");
}

export async function deleteTable(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const id = String(formData.get("id") || "");
  await supabase.from("restaurant_tables").delete().eq("id", id);
  revalidatePath("/dashboard/tables");
}
