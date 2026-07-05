import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const admin = createAdminClient();
  let body: { token?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const token = String(body.token || "");
  if (!token) return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });

  const { data: table } = await admin
    .from("restaurant_tables")
    .select("id, restaurant_id, table_number")
    .eq("qr_token", token)
    .maybeSingle();
  if (!table) return NextResponse.json({ error: "ترابيزة غير معروفة" }, { status: 404 });

  // تجنّب التكرار: لا تنشئ نداءً جديداً إن وُجد نداء معلّق لنفس الترابيزة
  const { data: existing } = await admin
    .from("waiter_calls")
    .select("id")
    .eq("table_id", table.id)
    .eq("status", "pending")
    .maybeSingle();
  if (existing) return NextResponse.json({ ok: true, already: true });

  const { error } = await admin.from("waiter_calls").insert({
    restaurant_id: table.restaurant_id,
    table_id: table.id,
    table_number: table.table_number,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
