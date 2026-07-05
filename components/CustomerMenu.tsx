"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TAG_LABELS, type Category, type Product } from "@/lib/types";
import { withBase } from "@/lib/basePath";

export default function CustomerMenu({
  token,
  tableNumber,
  restaurantName,
  logoUrl,
  currency,
  waterBottles,
  waterPrice,
  categories,
  products,
}: {
  token: string;
  tableNumber: number;
  restaurantName: string;
  logoUrl?: string | null;
  currency: string;
  waterBottles: number;
  waterPrice: number;
  categories: Category[];
  products: Product[];
}) {
  const router = useRouter();
  const [cart, setCart] = useState<Record<string, number>>({});
  const [showCart, setShowCart] = useState(false);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [waiterState, setWaiterState] = useState<"idle" | "calling" | "called">("idle");

  async function callWaiter() {
    if (waiterState !== "idle") return;
    setWaiterState("calling");
    try {
      const res = await fetch(withBase("/api/waiter-call"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      setWaiterState(res.ok ? "called" : "idle");
      if (res.ok) setTimeout(() => setWaiterState("idle"), 8000);
    } catch {
      setWaiterState("idle");
    }
  }

  const prodById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const count = Object.values(cart).reduce((a, b) => a + b, 0);
  const itemsTotal = Object.entries(cart).reduce(
    (sum, [id, q]) => sum + (Number(prodById.get(id)?.price) || 0) * q,
    0
  );
  const waterTotal = waterBottles * waterPrice;
  const total = itemsTotal + (count > 0 ? waterTotal : 0);

  function setQty(id: string, qty: number) {
    setCart((c) => {
      const next = { ...c };
      if (qty <= 0) delete next[id];
      else next[id] = qty;
      return next;
    });
  }

  function sessionId() {
    let s = localStorage.getItem("rest_session");
    if (!s) {
      s = crypto.randomUUID();
      localStorage.setItem("rest_session", s);
    }
    return s;
  }

  async function submit() {
    setSending(true);
    setError(null);
    try {
      const items = Object.entries(cart).map(([product_id, quantity]) => ({ product_id, quantity }));
      const res = await fetch(withBase("/api/order"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, items, note, session_id: sessionId() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "فشل إرسال الطلب");
        return;
      }
      router.push(`/t/${token}/order/${data.orderId}`);
    } catch {
      setError("تعذّر الاتصال بالخادم");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto w-full pb-28">
      {/* الهيدر */}
      <header className="sticky top-0 z-20 bg-background/90 backdrop-blur border-b border-black/10 px-4 py-3 flex items-center gap-3">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" className="w-11 h-11 rounded-full object-cover" />
        ) : (
          <div className="w-11 h-11 rounded-full bg-black/5 grid place-items-center">🍽️</div>
        )}
        <div className="flex-1">
          <h1 className="font-bold leading-tight">{restaurantName}</h1>
          <p className="text-xs text-black/50">ترابيزة رقم {tableNumber}</p>
        </div>
        <button
          onClick={callWaiter}
          disabled={waiterState !== "idle"}
          className={`rounded-full px-3 py-2 text-sm font-semibold transition ${
            waiterState === "called"
              ? "bg-green-100 text-green-700"
              : "bg-brand/10 text-brand hover:bg-brand/20"
          }`}
        >
          {waiterState === "called" ? "✓ تم النداء" : waiterState === "calling" ? "..." : "🔔 نداء الجرسون"}
        </button>
      </header>

      {/* الأقسام */}
      <div className="px-4 py-4 space-y-7">
        {categories.map((cat) => {
          const items = products.filter((p) => p.category_id === cat.id);
          if (items.length === 0) return null;
          return (
            <section key={cat.id}>
              <h2 className="text-lg font-bold text-brand mb-3">{cat.name_ar}</h2>
              <div className="space-y-3">
                {items.map((p) => (
                  <ProductRow key={p.id} p={p} currency={currency} qty={cart[p.id] || 0} setQty={setQty} />
                ))}
              </div>
            </section>
          );
        })}
        {products.length === 0 && (
          <p className="text-center text-black/50 py-10">لا توجد منتجات متاحة حالياً.</p>
        )}
      </div>

      {/* شريط السلة العائم */}
      {count > 0 && (
        <div className="fixed bottom-4 inset-x-0 px-4 z-30">
          <button
            onClick={() => setShowCart(true)}
            className="max-w-2xl mx-auto w-full flex items-center justify-between rounded-2xl bg-brand text-white px-5 py-3.5 font-bold shadow-xl"
          >
            <span>عرض الطلب ({count})</span>
            <span>{total} {currency}</span>
          </button>
        </div>
      )}

      {/* السلة / الريسيت */}
      {showCart && (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/40" onClick={() => setShowCart(false)}>
          <div
            className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">ملخص الطلب</h3>
                <button onClick={() => setShowCart(false)} className="text-black/40 text-xl">✕</button>
              </div>

              <div className="space-y-3">
                {Object.entries(cart).map(([id, q]) => {
                  const p = prodById.get(id);
                  if (!p) return null;
                  return (
                    <div key={id} className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="font-semibold text-sm">{p.name_ar}</div>
                        <div className="text-xs text-black/50">{p.price} {currency}</div>
                      </div>
                      <Stepper qty={q} onChange={(v) => setQty(id, v)} />
                      <div className="w-16 text-left font-bold text-sm">{Number(p.price) * q} {currency}</div>
                    </div>
                  );
                })}

                {waterBottles > 0 && (
                  <div className={`flex items-center justify-between text-sm border-t border-dashed pt-3 ${waterPrice > 0 ? "text-black/70" : "text-green-700"}`}>
                    <span>💧 {waterBottles} زجاجة مياه</span>
                    <span>{waterPrice > 0 ? `${waterTotal} ${currency}` : "مجاناً"}</span>
                  </div>
                )}
              </div>

              <div className="mt-4">
                <label className="block text-xs mb-1 text-black/60">ملاحظات للمطبخ (اختياري)</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm outline-none focus:border-brand"
                  placeholder="مثال: بدون بصل"
                />
              </div>

              <div className="flex items-center justify-between mt-4 text-lg font-extrabold">
                <span>الإجمالي</span>
                <span className="text-brand">{total} {currency}</span>
              </div>

              {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

              <button
                onClick={submit}
                disabled={sending}
                className="mt-4 w-full rounded-xl bg-green-600 text-white py-3.5 font-bold hover:bg-green-700 disabled:opacity-50"
              >
                {sending ? "جارٍ الإرسال..." : "🍳 إرسال الطلب للمطبخ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProductRow({
  p,
  currency,
  qty,
  setQty,
}: {
  p: Product;
  currency: string;
  qty: number;
  setQty: (id: string, qty: number) => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white p-3">
      {p.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.image_url} alt="" className="w-20 h-20 rounded-xl object-cover shrink-0" />
      ) : (
        <div className="w-20 h-20 rounded-xl bg-black/5 grid place-items-center text-3xl shrink-0">🍽️</div>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-bold flex items-center gap-1.5 flex-wrap">
          {p.name_ar}
          {p.tags?.map((t) => (
            <span key={t} className="text-[10px] bg-black/5 rounded px-1">{TAG_LABELS[t] ?? t}</span>
          ))}
        </div>
        {p.ingredients && <p className="text-xs text-black/50 line-clamp-2">{p.ingredients}</p>}
        <div className="flex items-center justify-between mt-1">
          <span className="font-extrabold text-brand">{p.price} {currency}</span>
          {qty > 0 ? (
            <Stepper qty={qty} onChange={(v) => setQty(p.id, v)} />
          ) : (
            <button
              onClick={() => setQty(p.id, 1)}
              className="rounded-lg bg-brand text-white px-4 py-1.5 text-sm font-semibold hover:bg-brand-dark"
            >
              أضف +
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Stepper({ qty, onChange }: { qty: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <button onClick={() => onChange(qty - 1)} className="w-7 h-7 rounded-full border grid place-items-center hover:bg-black/5">−</button>
      <span className="w-5 text-center font-bold text-sm">{qty}</span>
      <button onClick={() => onChange(qty + 1)} className="w-7 h-7 rounded-full bg-brand text-white grid place-items-center hover:bg-brand-dark">+</button>
    </div>
  );
}
