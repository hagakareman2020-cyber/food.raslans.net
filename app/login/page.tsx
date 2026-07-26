"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import PoweredBy from "@/components/PoweredBy";
import BrandLogo from "@/components/BrandLogo";

// نحفظ البريد فقط. كلمة المرور تُترك لمدير كلمات السر في المتصفح (مشفّر وآمن).
const REMEMBER_KEY = "raslan_remembered_email";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // استرجاع البريد المحفوظ عند فتح الصفحة
  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_KEY);
      if (saved) {
        setEmail(saved);
        setRemember(true);
      }
    } catch {
      // localStorage غير متاح — تجاهل
    }
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("بيانات الدخول غير صحيحة");
      setLoading(false);
      return;
    }

    try {
      if (remember) localStorage.setItem(REMEMBER_KEY, email);
      else localStorage.removeItem(REMEMBER_KEY);
    } catch {
      // تجاهل
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 py-12">
      <BrandLogo size={48} textClassName="text-2xl" subtitle />
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 p-8"
      >
        <h1 className="text-2xl font-bold text-center">تسجيل الدخول</h1>
        <p className="text-center text-sm text-black/50 dark:text-white/50 mt-1">
          ادخل إلى لوحة تحكم نشاطك
        </p>

        <label className="block mt-6 text-sm font-medium">البريد الإلكتروني</label>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:border-brand"
          placeholder="you@example.com"
        />

        <label className="block mt-4 text-sm font-medium">كلمة المرور</label>
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:border-brand"
          placeholder="••••••••"
        />

        <div className="mt-4 flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="accent-brand w-4 h-4"
            />
            تذكّرني
          </label>
          <Link
            href="/forgot-password"
            className="text-sm text-brand font-semibold hover:underline"
          >
            نسيت كلمة المرور؟
          </Link>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-lg bg-brand text-white py-2.5 font-semibold hover:bg-brand-dark transition disabled:opacity-60"
        >
          {loading ? "جارٍ الدخول..." : "دخول"}
        </button>

        <p className="mt-4 text-center text-sm text-black/60 dark:text-white/60">
          ليس لديك حساب؟{" "}
          <Link href="/register" className="text-brand font-semibold">
            سجّل نشاطك
          </Link>
        </p>
      </form>
      <PoweredBy />
    </div>
  );
}
