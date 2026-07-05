"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { applyMenuVersion } from "@/lib/actions/menu";
import ThemedMenu, { type ThemedMenuContent } from "@/components/ThemedMenu";
import { withBase } from "@/lib/basePath";

type Version = {
  id: string;
  content: ThemedMenuContent;
  is_approved: boolean;
  created_at: string;
};

const COOLDOWN = 60;

export default function MenuGenerator({
  initialVersions,
  currency,
  restaurantName,
  logoUrl,
}: {
  initialVersions: Version[];
  currency: string;
  restaurantName: string;
  logoUrl?: string | null;
}) {
  const router = useRouter();
  const [versions, setVersions] = useState<Version[]>(initialVersions);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialVersions[0]?.id ?? null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [applying, startApply] = useTransition();

  // مؤقّت لحساب الكولداون
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const cooldownRemaining = useMemo(() => {
    const latest = versions[0];
    if (!latest) return 0;
    const elapsed = (now - new Date(latest.created_at).getTime()) / 1000;
    return Math.max(0, Math.ceil(COOLDOWN - elapsed));
  }, [versions, now]);

  const selected = versions.find((v) => v.id === selectedId) ?? null;

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(withBase("/api/generate-menu"), { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "cooldown") {
          setError(`انتظر ${data.remaining} ثانية قبل التوليد مجدداً`);
        } else {
          setError(data.error || "فشل التوليد");
        }
        return;
      }
      setVersions((v) => [data.version, ...v]);
      setSelectedId(data.version.id);
    } catch {
      setError("تعذّر الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  }

  function approve(id: string) {
    startApply(async () => {
      const r = await applyMenuVersion(id);
      if (r?.error) setError(r.error);
      else {
        router.push("/dashboard/menu");
        router.refresh();
      }
    });
  }

  const canGenerate = !loading && cooldownRemaining === 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      {/* العمود الجانبي: زر التوليد + النسخ السابقة */}
      <div className="space-y-4">
        <button
          onClick={generate}
          disabled={!canGenerate}
          className="w-full rounded-lg bg-brand text-white py-3 font-semibold hover:bg-brand-dark transition disabled:opacity-50"
        >
          {loading
            ? "جارٍ التوليد..."
            : cooldownRemaining > 0
            ? `توليد مجدداً بعد ${cooldownRemaining}ث`
            : "✨ توليد منيو جديد"}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}

        <div>
          <h3 className="text-sm font-bold mb-2 text-black/60 dark:text-white/60">
            النسخ المولّدة سابقاً
          </h3>
          <div className="space-y-2">
            {versions.length === 0 && (
              <p className="text-sm text-black/40">لا توجد نسخ بعد.</p>
            )}
            {versions.map((v) => (
              <button
                key={v.id}
                onClick={() => setSelectedId(v.id)}
                className={`w-full text-right rounded-lg border px-3 py-2 text-sm transition ${
                  selectedId === v.id
                    ? "border-brand bg-brand/5"
                    : "border-black/10 dark:border-white/10 hover:border-brand/50"
                }`}
              >
                <div className="font-semibold truncate">
                  {v.content?.title || "منيو مقترح"}
                </div>
                <div className="text-xs text-black/50 flex items-center justify-between">
                  <span>{new Date(v.created_at).toLocaleString("ar-EG")}</span>
                  {v.is_approved && (
                    <span className="text-green-600">✓ معتمد</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* المعاينة */}
      <div className="min-h-[300px]">
        {!selected ? (
          <div className="h-full min-h-[300px] grid place-items-center text-black/40 text-center rounded-2xl border border-dashed border-black/15 p-6">
            اضغط «توليد منيو جديد» لعرض تصميم المنيو المقترح هنا.
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-end gap-2 mb-3">
              <a
                href={withBase(`/menu-pdf/${selected.id}`)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-black/15 px-5 py-2 font-semibold hover:bg-black/5 transition whitespace-nowrap"
              >
                ⬇️ تحميل PDF
              </a>
              <button
                onClick={() => approve(selected.id)}
                disabled={applying}
                className="rounded-lg bg-green-600 text-white px-5 py-2 font-semibold hover:bg-green-700 transition disabled:opacity-50 whitespace-nowrap"
              >
                {applying ? "جارٍ الاعتماد..." : "✓ اعتماد هذا المنيو"}
              </button>
            </div>
            <ThemedMenu
              content={selected.content}
              restaurantName={restaurantName}
              logoUrl={logoUrl}
              currency={currency}
            />
          </div>
        )}
      </div>
    </div>
  );
}
