import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActiveRestaurant } from "@/lib/auth";

// تخزين/تحديث رمز جهاز الإشعارات للمستخدم الحالي
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { token } = await req.json().catch(() => ({ token: null }));
  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "رمز غير صالح" }, { status: 400 });
  }

  const restaurant = await getActiveRestaurant();

  const { error } = await supabase.from("push_tokens").upsert(
    {
      user_id: user.id,
      restaurant_id: restaurant?.id ?? null,
      token,
      platform: "web",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "token" }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
