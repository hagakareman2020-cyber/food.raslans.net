"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import PoweredBy from "@/components/PoweredBy";
import BrandLogo from "@/components/BrandLogo";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    // إذا كان تأكيد البريد مفعّلاً لن توجد جلسة فورية
    if (!data.session) {
      setInfo("تم إنشاء الحساب. راجع بريدك لتأكيد الحساب ثم سجّل الدخول.");
      setLoading(false);
      return;
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
        <h1 className="text-2xl font-bold text-center">سجّل نشاطك</h1>
        <p className="text-center text-sm text-black/50 dark:text-white/50 mt-1">
          أنشئ حسابك وابدأ في دقائق
        </p>

        <label className="block mt-6 text-sm font-medium">الاسم</label>
        <input
          type="text"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="mt-1 w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:border-brand"
          placeholder="اسمك"
        />

        <label className="block mt-4 text-sm font-medium">البريد الإلكتروني</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:border-brand"
          placeholder="you@example.com"
        />

        <label className="block mt-4 text-sm font-medium">كلمة المرور</label>
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:border-brand"
          placeholder="6 أحرف على الأقل"
        />

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        {info && <p className="mt-3 text-sm text-green-600">{info}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-lg bg-brand text-white py-2.5 font-semibold hover:bg-brand-dark transition disabled:opacity-60"
        >
          {loading ? "جارٍ الإنشاء..." : "إنشاء الحساب"}
        </button>

        <p className="mt-4 text-center text-sm text-black/60 dark:text-white/60">
          لديك حساب؟{" "}
          <Link href="/login" className="text-brand font-semibold">
            سجّل الدخول
          </Link>
        </p>
      </form>
      <PoweredBy />
    </div>
  );
}
