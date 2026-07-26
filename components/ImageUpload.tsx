"use client";

import { useState } from "react";
import { withBase } from "@/lib/basePath";

// يرفع صورة إلى bucket public-assets عبر API route (مفتاح الخدمة على السيرفر)
// ويضبط قيمة حقل مخفي باسم name ليُرسل مع الفورم.
export default function ImageUpload({
  name,
  folder,
  label = "الصورة",
  initialUrl = "",
}: {
  name: string;
  folder: string;
  label?: string;
  initialUrl?: string;
}) {
  const [url, setUrl] = useState<string>(initialUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", folder);
      const res = await fetch(withBase("/api/upload"), { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "فشل رفع الصورة");
        return;
      }
      setUrl(data.url);
    } catch {
      setError("تعذّر الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input type="hidden" name={name} value={url} />
      <div className="flex items-center gap-3">
        {url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="w-14 h-14 rounded-lg object-cover border" />
        )}
        <input
          type="file"
          accept="image/*"
          onChange={onChange}
          className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:text-white file:px-3 file:py-1.5 file:cursor-pointer"
        />
        {loading && <span className="text-sm text-black/50">جارٍ الرفع...</span>}
      </div>
      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
    </div>
  );
}
