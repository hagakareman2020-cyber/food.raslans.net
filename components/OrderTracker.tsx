"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { withBase } from "@/lib/basePath";

type OrderStatus = "received" | "preparing" | "ready" | "served" | "cancelled";

type Item = { id: string; product_id: string | null; name_ar: string; is_free: boolean };
type OrderInfo = {
  status: OrderStatus;
  eta_minutes: number | null;
  total: number;
  created_at: string;
  ready_at: string | null;
  table_number: number | null;
  order_items?: Item[];
};

const STEPS: { key: OrderStatus; label: string; icon: string }[] = [
  { key: "received", label: "تم الاستلام", icon: "📥" },
  { key: "preparing", label: "قيد التحضير", icon: "👨‍🍳" },
  { key: "ready", label: "جاهز", icon: "✅" },
  { key: "served", label: "تم التقديم", icon: "🍽️" },
];

export default function OrderTracker({ token, orderId }: { token: string; orderId: string }) {
  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stars, setStars] = useState<Record<string, number>>({});
  const [rated, setRated] = useState(false);

  async function submitRating() {
    const ratings = Object.entries(stars).map(([product_id, rating]) => ({ product_id, rating }));
    if (ratings.length === 0) return;
    const res = await fetch(withBase("/api/rate"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, orderId, ratings }),
    });
    if (res.ok) setRated(true);
  }

  useEffect(() => {
    let active = true;
    async function poll() {
      try {
        const res = await fetch(withBase(`/api/order/status?token=${token}&orderId=${orderId}`));
        const data = await res.json();
        if (!active) return;
        if (!res.ok) setError(data.error || "تعذّر جلب الحالة");
        else setOrder(data.order);
      } catch {
        /* تجاهل */
      }
    }
    poll();
    const t = setInterval(poll, 4000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [token, orderId]);

  if (error) {
    return (
      <div className="text-center text-black/60">
        <div className="text-4xl mb-2">😕</div>
        {error}
      </div>
    );
  }
  if (!order) {
    return <div className="text-black/50">جارٍ تحميل حالة الطلب...</div>;
  }

  const currentIdx = STEPS.findIndex((s) => s.key === order.status);
  const cancelled = order.status === "cancelled";

  // الوقت المتوقع المتبقّي
  const created = new Date(order.created_at).getTime();
  const etaMs = (order.eta_minutes ?? 15) * 60000;
  const remaining = Math.max(0, Math.ceil((created + etaMs - Date.now()) / 60000));

  return (
    <div className="w-full max-w-md rounded-3xl border border-black/10 bg-white p-6 text-center">
      <div className="text-5xl mb-2">{cancelled ? "❌" : STEPS[Math.max(0, currentIdx)]?.icon}</div>
      <h1 className="text-xl font-bold">
        {cancelled ? "أُلغي الطلب" : STEPS[Math.max(0, currentIdx)]?.label}
      </h1>
      <p className="text-sm text-black/50 mt-1">
        ترابيزة رقم {order.table_number} · الإجمالي {order.total}
      </p>

      {!cancelled && order.status !== "served" && (
        <div className="mt-4 rounded-xl bg-brand/5 text-brand py-3 font-bold">
          {order.status === "ready" ? "طلبك جاهز! 🎉" : `الوقت المتوقّع: ~${remaining} دقيقة`}
        </div>
      )}

      {/* الخطوات */}
      {!cancelled && (
        <div className="flex items-center justify-between mt-6">
          {STEPS.map((s, i) => {
            const done = i <= currentIdx;
            return (
              <div key={s.key} className="flex-1 flex flex-col items-center relative">
                {i > 0 && (
                  <div
                    className="absolute top-4 right-1/2 w-full h-0.5"
                    style={{ background: i <= currentIdx ? "#c2410c" : "#e5e0d8" }}
                  />
                )}
                <div
                  className="relative w-8 h-8 rounded-full grid place-items-center text-sm z-10"
                  style={{
                    background: done ? "#c2410c" : "#f0ece6",
                    color: done ? "#fff" : "#9a9088",
                  }}
                >
                  {done ? "✓" : i + 1}
                </div>
                <span className="text-[11px] mt-1" style={{ color: done ? "#1a1410" : "#9a9088" }}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* تقييم الأطباق بعد التقديم */}
      {order.status === "served" && !rated && (
        <div className="mt-6 border-t border-black/10 pt-4 text-right">
          <h3 className="font-bold text-center mb-3">قيّم طلبك 🌟</h3>
          <div className="space-y-2">
            {(order.order_items ?? [])
              .filter((it) => it.product_id && !it.is_free)
              .map((it) => (
                <div key={it.id} className="flex items-center justify-between">
                  <span className="text-sm">{it.name_ar}</span>
                  <div className="flex gap-1 flex-row-reverse">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        onClick={() => setStars((s) => ({ ...s, [it.product_id!]: n }))}
                        className="text-xl leading-none"
                        style={{ color: (stars[it.product_id!] || 0) >= n ? "#f59e0b" : "#d6d3d1" }}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>
              ))}
          </div>
          <button
            onClick={submitRating}
            disabled={Object.keys(stars).length === 0}
            className="mt-4 w-full rounded-lg bg-brand text-white py-2.5 font-semibold hover:bg-brand-dark disabled:opacity-50"
          >
            إرسال التقييم
          </button>
        </div>
      )}
      {rated && <p className="mt-4 text-green-700 font-semibold">شكراً لتقييمك! 🌟</p>}

      <Link href={`/t/${token}`} className="inline-block mt-6 text-sm text-brand font-semibold hover:underline">
        ← العودة للمنيو
      </Link>
    </div>
  );
}
