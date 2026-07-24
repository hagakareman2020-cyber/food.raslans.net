"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import PoweredBy from "@/components/PoweredBy";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [ready, setReady] = useState<boolean | null>(null); // null = جارٍ التحقق
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  // يتحقق من صلاحية رابط الاستعادة (يدعم رابط PKCE ورابط التوكن)
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    (async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!cancelled && !error) {
          setReady(true);
          return;
        }
      }
      const { data } = await supabase.auth.getSession();
      if (!cancelled) setReady(!!data.session);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled && session) setReady(true);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setError("كلمة المرور لازم تكون 6 أحرف على الأقل");
      return;
    }
    if (password !== confirm) {
      setError("كلمتا المرور غير متطابقتين");
      return;
    }
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError("تعذّر تغيير كلمة المرور. جرّب طلب رابط جديد.");
      return;
    }
    setDone(true);
    setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 1500);
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 p-8">
        <h1 className="text-2xl font-bold text-center">تعيين كلمة مرور جديدة</h1>

        {ready === null && (
          <p className="mt-6 text-center text-sm text-black/50">جارٍ التحقق من الرابط...</p>
        )}

        {ready === false && (
          <div className="mt-6 text-center">
            <div className="text-5xl mb-3">⚠️</div>
            <p className="text-sm text-black/70 dark:text-white/70">
              الرابط غير صالح أو انتهت صلاحيته.
            </p>
            <Link
              href="/forgot-password"
              className="mt-6 block rounded-lg bg-brand text-white py-2.5 font-semibold hover:bg-brand-dark transition"
            >
              اطلب رابط جديد
            </Link>
          </div>
        )}

        {ready === true &&
          (done ? (
            <div className="mt-6 text-center">
              <div className="text-5xl mb-3">✅</div>
              <p className="text-sm text-black/70 dark:text-white/70">
                تم تغيير كلمة المرور بنجاح. جارٍ تحويلك للوحة التحكم...
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit}>
              <p className="text-center text-sm text-black/50 dark:text-white/50 mt-1">
                اكتب كلمة المرور الجديدة
              </p>

              <label className="block mt-6 text-sm font-medium">كلمة المرور الجديدة</label>
              <input
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:border-brand"
                placeholder="6 أحرف على الأقل"
              />

              <label className="block mt-4 text-sm font-medium">تأكيد كلمة المرور</label>
              <input
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="mt-1 w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:border-brand"
                placeholder="••••••••"
              />

              {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="mt-6 w-full rounded-lg bg-brand text-white py-2.5 font-semibold hover:bg-brand-dark transition disabled:opacity-60"
              >
                {loading ? "جارٍ الحفظ..." : "حفظ كلمة المرور"}
              </button>
            </form>
          ))}
      </div>
      <PoweredBy />
    </div>
  );
}
