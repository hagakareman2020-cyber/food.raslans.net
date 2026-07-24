"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import PoweredBy from "@/components/PoweredBy";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);

    if (error) {
      setError("تعذّر إرسال الرابط. تأكد من البريد وحاول مرة أخرى.");
      return;
    }
    setSent(true);
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 p-8">
        <h1 className="text-2xl font-bold text-center">نسيت كلمة المرور؟</h1>

        {sent ? (
          <>
            <div className="mt-6 text-center">
              <div className="text-5xl mb-3">📧</div>
              <p className="text-sm text-black/70 dark:text-white/70">
                لو البريد <span className="font-semibold">{email}</span> مسجّل عندنا، هيوصلك رابط
                لإعادة تعيين كلمة المرور خلال دقايق.
              </p>
              <p className="text-xs text-black/45 mt-3">
                متلقيتش الرسالة؟ شوف مجلد الرسائل غير المرغوب فيها (Spam).
              </p>
            </div>
            <Link
              href="/login"
              className="mt-6 block text-center rounded-lg border border-black/15 py-2.5 font-semibold hover:bg-black/5 transition"
            >
              رجوع لتسجيل الدخول
            </Link>
          </>
        ) : (
          <form onSubmit={onSubmit}>
            <p className="text-center text-sm text-black/50 dark:text-white/50 mt-1">
              اكتب بريدك ونبعتلك رابط لإعادة تعيين كلمة المرور
            </p>

            <label className="block mt-6 text-sm font-medium">البريد الإلكتروني</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:border-brand"
              placeholder="you@example.com"
            />

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full rounded-lg bg-brand text-white py-2.5 font-semibold hover:bg-brand-dark transition disabled:opacity-60"
            >
              {loading ? "جارٍ الإرسال..." : "إرسال رابط الاستعادة"}
            </button>

            <p className="mt-4 text-center text-sm text-black/60 dark:text-white/60">
              فاكر كلمة المرور؟{" "}
              <Link href="/login" className="text-brand font-semibold">
                تسجيل الدخول
              </Link>
            </p>
          </form>
        )}
      </div>
      <PoweredBy />
    </div>
  );
}
