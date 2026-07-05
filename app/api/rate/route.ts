import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Rating = { product_id: string; rating: number };

export async function POST(req: Request) {
  const admin = createAdminClient();
  let body: { token?: string; orderId?: string; ratings?: Rating[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const token = String(body.token || "");
  const orderId = String(body.orderId || "");
  const ratings = Array.isArray(body.ratings) ? body.ratings : [];
  if (!token || !orderId || ratings.length === 0) {
    return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
  }

  // التحقق أن الطلب يخص هذه الترابيزة
  const { data: table } = await admin
    .from("restaurant_tables")
    .select("id")
    .eq("qr_token", token)
    .maybeSingle();
  if (!table) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  const { data: order } = await admin
    .from("orders")
    .select("id")
    .eq("id", orderId)
    .eq("table_id", table.id)
    .maybeSingle();
  if (!order) return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });

  // منع التقييم المكرر لنفس الطلب
  const { data: existing } = await admin
    .from("order_ratings")
    .select("id")
    .eq("order_id", orderId)
    .limit(1)
    .maybeSingle();
  if (existing) return NextResponse.json({ ok: true, already: true });

  const rows = ratings
    .filter((r) => r.product_id && r.rating >= 1 && r.rating <= 5)
    .map((r) => ({ order_id: orderId, product_id: r.product_id, rating: Math.round(r.rating) }));
  if (rows.length === 0) return NextResponse.json({ error: "لا تقييمات صالحة" }, { status: 400 });

  const { error } = await admin.from("order_ratings").insert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
