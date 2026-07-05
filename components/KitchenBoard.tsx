"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { OrderStatus } from "@/lib/types";

type OrderItem = {
  id: string;
  name_ar: string;
  quantity: number;
  note: string | null;
  is_free: boolean;
};
type Order = {
  id: string;
  table_number: number | null;
  status: OrderStatus;
  total: number;
  eta_minutes: number | null;
  note: string | null;
  created_at: string;
  order_items: OrderItem[];
};

const NEXT: Record<string, { to: OrderStatus; label: string } | null> = {
  received: { to: "preparing", label: "ابدأ التحضير" },
  preparing: { to: "ready", label: "جاهز ✅" },
  ready: { to: "served", label: "تم التقديم" },
};

const STATUS_STYLE: Record<string, string> = {
  received: "bg-amber-100 text-amber-800 border-amber-300",
  preparing: "bg-blue-100 text-blue-800 border-blue-300",
  ready: "bg-green-100 text-green-800 border-green-300",
};

export default function KitchenBoard({
  restaurantId,
  currency,
  initialOrders,
}: {
  restaurantId: string;
  currency: string;
  initialOrders: Order[];
}) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [calls, setCalls] = useState<{ id: string; table_number: number | null }[]>([]);
  const [, force] = useState(0);
  const supabaseRef = useRef(createClient());
  const prevCount = useRef(initialOrders.length);

  async function refetchCalls() {
    const { data } = await supabaseRef.current
      .from("waiter_calls")
      .select("id, table_number")
      .eq("restaurant_id", restaurantId)
      .eq("status", "pending")
      .order("created_at");
    if (data) setCalls(data as { id: string; table_number: number | null }[]);
  }

  async function resolveCall(id: string) {
    await supabaseRef.current.from("waiter_calls").update({ status: "done" }).eq("id", id);
    refetchCalls();
  }

  async function refetch() {
    const { data } = await supabaseRef.current
      .from("orders")
      .select("*, order_items(*)")
      .eq("restaurant_id", restaurantId)
      .in("status", ["received", "preparing", "ready"])
      .order("created_at", { ascending: true });
    if (data) {
      if (data.length > prevCount.current) {
        // تنبيه صوتي عند وصول طلب جديد
        try {
          const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g);
          g.connect(ctx.destination);
          o.frequency.value = 880;
          g.gain.value = 0.1;
          o.start();
          o.stop(ctx.currentTime + 0.25);
        } catch {}
      }
      prevCount.current = data.length;
      setOrders(data as Order[]);
    }
  }

  useEffect(() => {
    const supabase = supabaseRef.current;
    refetchCalls();
    const channel = supabase
      .channel(`kitchen:${restaurantId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `restaurant_id=eq.${restaurantId}` },
        () => refetch()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "waiter_calls", filter: `restaurant_id=eq.${restaurantId}` },
        () => refetchCalls()
      )
      .subscribe();

    // مؤقّت لتحديث الوقت المنقضي المعروض
    const tick = setInterval(() => force((n) => n + 1), 15000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(tick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  async function advance(order: Order) {
    const next = NEXT[order.status];
    if (!next) return;
    const patch: Record<string, unknown> = { status: next.to };
    if (next.to === "ready") patch.ready_at = new Date().toISOString();
    if (next.to === "served") patch.served_at = new Date().toISOString();
    await supabaseRef.current.from("orders").update(patch).eq("id", order.id);
    refetch();
  }

  async function cancel(order: Order) {
    await supabaseRef.current.from("orders").update({ status: "cancelled" }).eq("id", order.id);
    refetch();
  }

  function minutesAgo(iso: string) {
    return Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  }

  return (
    <div>
      {/* نداءات الجرسون */}
      {calls.length > 0 && (
        <div className="mb-5 space-y-2">
          {calls.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between rounded-xl bg-amber-100 border border-amber-300 px-4 py-2.5 animate-pulse"
            >
              <span className="font-bold text-amber-900">
                🔔 نداء جرسون — ترابيزة {c.table_number ?? "—"}
              </span>
              <button
                onClick={() => resolveCall(c.id)}
                className="rounded-lg bg-amber-600 text-white px-4 py-1.5 text-sm font-semibold hover:bg-amber-700"
              >
                تم الرد
              </button>
            </div>
          ))}
        </div>
      )}

      {orders.length === 0 ? (
        <div className="text-center text-black/40 py-20">
          <div className="text-5xl mb-3">🍳</div>
          لا توجد طلبات حالياً. الطلبات الجديدة ستظهر هنا تلقائياً.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {orders.map((o) => {
        const next = NEXT[o.status];
        const mins = minutesAgo(o.created_at);
        const late = mins > (o.eta_minutes ?? 15);
        return (
          <div
            key={o.id}
            className={`rounded-2xl border-2 bg-white overflow-hidden ${
              late && o.status !== "ready" ? "border-red-400" : "border-black/10"
            }`}
          >
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-black/10">
              <div className="font-bold">
                {o.table_number != null ? `ترابيزة ${o.table_number}` : "🥡 تيك أواي"}
              </div>
              <span className={`text-[11px] rounded-full border px-2 py-0.5 ${STATUS_STYLE[o.status] ?? ""}`}>
                {o.status === "received" ? "جديد" : o.status === "preparing" ? "تحضير" : "جاهز"}
              </span>
            </div>

            <div className="p-4">
              <div className={`text-xs mb-2 ${late ? "text-red-600 font-bold" : "text-black/50"}`}>
                ⏱️ منذ {mins} دقيقة {late && o.status !== "ready" ? "(متأخر)" : ""}
              </div>
              <ul className="space-y-1 text-sm">
                {o.order_items?.map((it) => (
                  <li key={it.id} className="flex items-center justify-between">
                    <span className={it.is_free ? "text-green-700" : ""}>
                      <span className="font-bold">{it.quantity}×</span> {it.name_ar}
                      {it.note && <span className="text-xs text-black/50"> — {it.note}</span>}
                    </span>
                  </li>
                ))}
              </ul>
              {o.note && (
                <div className="mt-2 text-xs bg-amber-50 text-amber-800 rounded-lg px-2 py-1">
                  📝 {o.note}
                </div>
              )}

              <div className="flex items-center gap-2 mt-4">
                {next && (
                  <button
                    onClick={() => advance(o)}
                    className="flex-1 rounded-lg bg-brand text-white py-2 text-sm font-semibold hover:bg-brand-dark"
                  >
                    {next.label}
                  </button>
                )}
                <button
                  onClick={() => cancel(o)}
                  className="rounded-lg border border-red-200 text-red-600 px-3 py-2 text-sm hover:bg-red-50"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        );
      })}
        </div>
      )}
    </div>
  );
}
