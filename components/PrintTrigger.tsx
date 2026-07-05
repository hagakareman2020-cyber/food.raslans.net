"use client";

import { useEffect } from "react";

// يفتح مربّع الطباعة تلقائياً (لحفظ PDF) بعد تحميل الصور، مع زر يدوي.
export default function PrintTrigger() {
  useEffect(() => {
    const trigger = () => setTimeout(() => window.print(), 900);
    if (document.readyState === "complete") trigger();
    else window.addEventListener("load", trigger, { once: true });
  }, []);

  return (
    <div className="no-print fixed top-4 left-4 z-50 flex gap-2">
      <button
        onClick={() => window.print()}
        className="rounded-lg bg-brand text-white px-5 py-2 font-semibold shadow-lg hover:bg-brand-dark"
      >
        ⬇️ حفظ / طباعة PDF
      </button>
    </div>
  );
}
