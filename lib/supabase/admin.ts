// Supabase client بصلاحية service_role — يتجاوز RLS.
// ⚠️ للسيرفر فقط. لا تستورده أبداً في أي مكوّن متصفح.
// يُستخدم لأفعال العملاء المجهولين (إنشاء طلب، نداء جرسون) بعد التحقق من توكن الترابيزة.
import "server-only";
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
