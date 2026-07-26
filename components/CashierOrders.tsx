"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { OrderStatus } from "@/lib/types";

type OrderItem = { id: string; name_ar: string; price: number; quantity: number; is_free: boolean };
type Order = {
  id: string;
  table_number: number | null;
  status: OrderStatus;
  total: number;
  note: string | null;
  session_id: string | null;
  created_at: string;
  order_items: OrderItem[];
};

// طلبات العملاء الواصلة عبر QR + إصدار الفاتورة بضغطة — تصل تلقائياً عبر Realtime
export default function CashierOrders({
  restaurantId,
  restaurantName,
  currency,
  initialOrders,
}: {
  restaurantId: string;
  restaurantName: string;
  currency: string;
  initialOrders: Order[];
}) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [busy, setBusy] = useState<string | null>(null);
  const supabaseRef = useRef(createClient());
  const prevCount = useRef(initialOrders.length);

  async function refetch() {
    const { data } = await supabaseRef.current
      .from("orders")
      .select("*, order_items(*)")
      .eq("restaurant_id", restaurantId)
      .in("status", ["received", "preparing", "ready"])
      .order("created_at", { ascending: true });
    if (data) {
      if (data.length > prevCount.current) beep();
      prevCount.current = data.length;
      setOrders(data as Order[]);
    }
  }

  function beep() {
    try {
      const ctx = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.frequency.value = 760;
      g.gain.value = 0.1;
      o.start();
      o.stop(ctx.currentTime + 0.25);
    } catch {}
  }

  useEffect(() => {
    const supabase = supabaseRef.current;
    const channel = supabase
      .channel(`cashier:${restaurantId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `restaurant_id=eq.${restaurantId}` },
        () => refetch()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  // إصدار الفاتورة: طباعة الإيصال + إغلاق الطلب (تم التقديم/الدفع)
  async function issueInvoice(o: Order) {
    setBusy(o.id);
    printInvoice(o);
    await supabaseRef.current
      .from("orders")
      .update({ status: "served", served_at: new Date().toISOString() })
      .eq("id", o.id);
    await refetch();
    setBusy(null);
  }

  async function cancel(o: Order) {
    setBusy(o.id);
    await supabaseRef.current.from("orders").update({ status: "cancelled" }).eq("id", o.id);
    await refetch();
    setBusy(null);
  }

  function printInvoice(o: Order) {
    const lines = (o.order_items ?? [])
      .map(
        (it) =>
          `<tr><td>${it.name_ar}${it.is_free ? " (مجاني)" : ""}</td><td style="text-align:center">${it.quantity}</td><td style="text-align:left">${Number(it.price) * it.quantity} ${currency}</td></tr>`
      )
      .join("");
    const where = o.table_number != null ? "ترابيزة " + o.table_number : "تيك أواي";
    const w = window.open("", "_blank", "width=380,height=600");
    if (!w) return;
    w.document.write(`
      <html dir="rtl"><head><meta charset="utf-8"><title>فاتورة</title>
      <style>body{font-family:Tahoma,Arial;padding:12px;width:300px}h2{text-align:center;margin:4px}
      table{width:100%;border-collapse:collapse;font-size:13px}td{padding:3px 0;border-bottom:1px dashed #ccc}
      .total{font-weight:bold;font-size:16px;margin-top:8px;display:flex;justify-content:space-between}
      .muted{text-align:center;color:#666;font-size:12px}</style></head>
      <body onload="window.print();window.close()">
      <h2>${restaurantName}</h2>
      <p class="muted">فاتورة · ${where} — ${new Date().toLocaleString("ar-EG")}</p>
      <table>${lines}</table>
      <div class="total"><span>الإجمالي</span><span>${o.total} ${currency}</span></div>
      ${o.note ? `<p class="muted">ملاحظة: ${o.note}</p>` : ""}
      <p class="muted">شكراً لزيارتكم 🌟</p>
      </body></html>`);
    w.document.close();
  }

  function minutesAgo(iso: string) {
    return Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  }

  if (orders.length === 0) {
    return (
      <div className="text-center text-black/40 py-20">
        <div className="text-5xl mb-3">🧾</div>
        لا توجد طلبات مفتوحة. طلبات العملاء من الـ QR ستظهر هنا تلقائياً.
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {orders.map((o) => {
        const fromCustomer = o.session_id != null || o.note !== "طلب كاشير";
        return (
          <div key={o.id} className="rounded-2xl border-2 border-black/10 bg-white overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-black/10">
              <div className="font-bold">
                {o.table_number != null ? `🍽️ ترابيزة ${o.table_number}` : "🥡 تيك أواي"}
              </div>
              <span
                className={`text-[11px] rounded-full px-2 py-0.5 font-semibold ${
                  fromCustomer ? "bg-brand/10 text-brand" : "bg-black/5 text-black/60"
                }`}
              >
                {fromCustomer ? "📱 من العميل (QR)" : "كاشير"}
              </span>
            </div>
            <div className="p-4">
              <div className="text-xs text-black/50 mb-2">⏱️ منذ {minutesAgo(o.created_at)} دقيقة</div>
              <ul className="space-y-1 text-sm">
                {(o.order_items ?? []).map((it) => (
                  <li key={it.id} className="flex items-center justify-between">
                    <span className={it.is_free ? "text-green-700" : ""}>
                      <span className="font-bold">{it.quantity}×</span> {it.name_ar}
                    </span>
                    <span className="text-black/50">{Number(it.price) * it.quantity} {currency}</span>
                  </li>
                ))}
              </ul>
              {o.note && o.note !== "طلب كاشير" && (
                <div className="mt-2 text-xs bg-amber-50 text-amber-800 rounded-lg px-2 py-1">📝 {o.note}</div>
              )}
              <div className="flex items-center justify-between mt-3 font-extrabold">
                <span>الإجمالي</span>
                <span className="text-brand">{o.total} {currency}</span>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={() => issueInvoice(o)}
                  disabled={busy === o.id}
                  className="flex-1 rounded-lg bg-green-600 text-white py-2 text-sm font-bold hover:bg-green-700 disabled:opacity-50"
                >
                  🧾 إصدار الفاتورة
                </button>
                <button
                  onClick={() => cancel(o)}
                  disabled={busy === o.id}
                  className="rounded-lg border border-red-200 text-red-600 px-3 py-2 text-sm hover:bg-red-50 disabled:opacity-50"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
