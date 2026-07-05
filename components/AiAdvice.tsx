"use client";

import { useState } from "react";
import { withBase } from "@/lib/basePath";

type Advice = { kitchen?: string[]; dishes?: string[]; summary?: string };

export default function AiAdvice({ summary }: { summary: unknown }) {
  const [advice, setAdvice] = useState<Advice | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchAdvice() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(withBase("/api/advice"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "فشل جلب النصائح");
      else setAdvice(data.advice);
    } catch {
      setError("تعذّر الاتصال");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-black/10 bg-white p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold">🤖 نصائح ذكية</h2>
        <button
          onClick={fetchAdvice}
          disabled={loading}
          className="rounded-lg bg-brand text-white px-4 py-1.5 text-sm font-semibold hover:bg-brand-dark disabled:opacity-50"
        >
          {loading ? "جارٍ التحليل..." : advice ? "تحديث" : "احصل على نصائح"}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {!advice && !loading && !error && (
        <p className="text-sm text-black/40">اضغط الزر لتحليل مبيعاتك والحصول على نصائح للمطبخ والأطباق.</p>
      )}

      {advice && (
        <div className="space-y-4 text-sm">
          {advice.summary && <p className="text-black/70 bg-brand/5 rounded-lg p-3">{advice.summary}</p>}
          {advice.kitchen && advice.kitchen.length > 0 && (
            <div>
              <h3 className="font-bold mb-1">👨‍🍳 للمطبخ</h3>
              <ul className="list-disc pr-5 space-y-1 text-black/70">
                {advice.kitchen.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </div>
          )}
          {advice.dishes && advice.dishes.length > 0 && (
            <div>
              <h3 className="font-bold mb-1">🍽️ للأطباق</h3>
              <ul className="list-disc pr-5 space-y-1 text-black/70">
                {advice.dishes.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
