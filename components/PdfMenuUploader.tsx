"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setPdfMenu, clearPdfMenu } from "@/lib/actions/restaurant";
import { withBase } from "@/lib/basePath";

export default function PdfMenuUploader({
  currentUrl,
}: {
  currentUrl?: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      setError("الملف يجب أن يكون PDF");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "menus");
      const res = await fetch(withBase("/api/upload"), { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "فشل الرفع");
        return;
      }
      const r = await setPdfMenu(data.url);
      if (r?.error) setError(r.error);
      else router.refresh();
    } catch {
      setError("تعذّر الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  }

  function remove() {
    startTransition(async () => {
      await clearPdfMenu();
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-black/10 p-5 bg-white">
      <h3 className="font-bold mb-1">أو ارفع منيو PDF جاهز</h3>
      <p className="text-sm text-black/55 mb-3">
        لو عندك تصميم منيو خاص بك كملف PDF، ارفعه هنا ليُعتمد كمنيو مطعمك.
      </p>

      {currentUrl ? (
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-green-700 text-sm">✓ منيو PDF معتمد حالياً</span>
          <a
            href={currentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand text-sm font-semibold hover:underline"
          >
            عرض الملف
          </a>
          <button
            onClick={remove}
            disabled={pending}
            className="text-sm text-red-600 hover:underline disabled:opacity-50"
          >
            {pending ? "جارٍ الإزالة..." : "إزالة والعودة للمنيو المُولّد"}
          </button>
        </div>
      ) : (
        <input
          type="file"
          accept="application/pdf"
          onChange={onChange}
          className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:text-white file:px-4 file:py-2 file:cursor-pointer"
        />
      )}

      {loading && <p className="text-sm text-black/50 mt-2">جارٍ الرفع...</p>}
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </div>
  );
}
