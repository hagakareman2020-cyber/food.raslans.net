import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// حالة طلب لعميل مجهول — يتحقق من توكن الترابيزة المرتبط بالطلب
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token") || "";
  const orderId = searchParams.get("orderId") || "";
  if (!token || !orderId) {
    return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: table } = await admin
    .from("restaurant_tables")
    .select("id")
    .eq("qr_token", token)
    .maybeSingle();
  if (!table) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  const { data: order } = await admin
    .from("orders")
    .select("id, status, eta_minutes, total, created_at, ready_at, table_number, order_items(id, product_id, name_ar, is_free)")
    .eq("id", orderId)
    .eq("table_id", table.id)
    .maybeSingle();
  if (!order) return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });

  return NextResponse.json({ order });
}
