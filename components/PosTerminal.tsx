"use client";

import { useMemo, useState, useTransition } from "react";
import { createPosOrder } from "@/lib/actions/pos";
import type { Category, Product } from "@/lib/types";

type OrderType = "dine_in" | "takeaway";
type CustomItem = { id: string; name: string; price: number; qty: number };

export default function PosTerminal({
  restaurantName,
  currency,
  categories,
  products,
  tableNumbers,
}: {
  restaurantName: string;
  currency: string;
  categories: Category[];
  products: Product[];
  tableNumbers: number[];
}) {
  const [activeCat, setActiveCat] = useState<string>("all");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [customItems, setCustomItems] = useState<CustomItem[]>([]);
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [orderType, setOrderType] = useState<OrderType>("dine_in");
  const [table, setTable] = useState<number | "">(tableNumbers[0] ?? "");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ total: number } | null>(null);
  const [pending, start] = useTransition();

  const prodById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const shown = activeCat === "all" ? products : products.filter((p) => p.category_id === activeCat);

  const customTotal = customItems.reduce((s, c) => s + c.price * c.qty, 0);
  const count = Object.values(cart).reduce((a, b) => a + b, 0) + customItems.reduce((a, c) => a + c.qty, 0);
  const total =
    Object.entries(cart).reduce((s, [id, q]) => s + (Number(prodById.get(id)?.price) || 0) * q, 0) +
    customTotal;

  function addCustom() {
    const name = customName.trim();
    const price = Number(customPrice);
    if (!name || !Number.isFinite(price) || price < 0) return;
    setCustomItems((c) => [...c, { id: crypto.randomUUID(), name, price, qty: 1 }]);
    setCustomName("");
    setCustomPrice("");
  }
  function setCustomQty(id: string, qty: number) {
    setCustomItems((c) => (qty <= 0 ? c.filter((x) => x.id !== id) : c.map((x) => (x.id === id ? { ...x, qty } : x))));
  }

  function setQty(id: string, qty: number) {
    setCart((c) => {
      const n = { ...c };
      if (qty <= 0) delete n[id];
      else n[id] = qty;
      return n;
    });
  }
  function clear() {
    setCart({});
    setCustomItems([]);
    setNote("");
    setError(null);
  }

  function submit() {
    setError(null);
    if (orderType === "dine_in" && table === "") {
      setError("اختر رقم الترابيزة");
      return;
    }
    start(async () => {
      const r = await createPosOrder({
        items: Object.entries(cart).map(([product_id, quantity]) => ({ product_id, quantity })),
        customItems: customItems.map((c) => ({ name: c.name, price: c.price, quantity: c.qty })),
        tableNumber: orderType === "dine_in" ? Number(table) : null,
        note,
      });
      if (r.error) setError(r.error);
      else {
        setDone({ total: r.total ?? total });
        printReceipt(r.total ?? total);
        setCart({});
        setCustomItems([]);
        setNote("");
      }
    });
  }

  function printReceipt(finalTotal: number) {
    const prodLines = Object.entries(cart)
      .map(([id, q]) => {
        const p = prodById.get(id);
        if (!p) return "";
        return `<tr><td>${p.name_ar}</td><td style="text-align:center">${q}</td><td style="text-align:left">${Number(p.price) * q} ${currency}</td></tr>`;
      })
      .join("");
    const customLines = customItems
      .map((c) => `<tr><td>${c.name}</td><td style="text-align:center">${c.qty}</td><td style="text-align:left">${c.price * c.qty} ${currency}</td></tr>`)
      .join("");
    const lines = prodLines + customLines;
    const w = window.open("", "_blank", "width=380,height=600");
    if (!w) return;
    w.document.write(`
      <html dir="rtl"><head><meta charset="utf-8"><title>إيصال</title>
      <style>body{font-family:Tahoma,Arial;padding:12px;width:300px}h2{text-align:center;margin:4px}
      table{width:100%;border-collapse:collapse;font-size:13px}td{padding:3px 0;border-bottom:1px dashed #ccc}
      .total{font-weight:bold;font-size:16px;margin-top:8px;display:flex;justify-content:space-between}
      .muted{text-align:center;color:#666;font-size:12px}</style></head>
      <body onload="window.print();window.close()">
      <h2>${restaurantName}</h2>
      <p class="muted">${orderType === "dine_in" ? "صالة · ترابيزة " + table : "تيك أواي"} — ${new Date().toLocaleString("ar-EG")}</p>
      <table>${lines}</table>
      <div class="total"><span>الإجمالي</span><span>${finalTotal} ${currency}</span></div>
      <p class="muted">شكراً لزيارتكم 🌟</p>
      </body></html>`);
    w.document.close();
  }

  if (done) {
    return (
      <div className="min-h-[70vh] grid place-items-center p-6">
        <div className="text-center">
          <div className="text-6xl mb-3">✅</div>
          <h2 className="text-2xl font-bold">تم إرسال الطلب للمطبخ</h2>
          <p className="text-black/60 mt-1">الإجمالي {done.total} {currency}</p>
          <button
            onClick={() => setDone(null)}
            className="mt-6 rounded-xl bg-brand text-white px-8 py-3 font-bold hover:bg-brand-dark"
          >
            طلب جديد
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-[1fr_360px] min-h-[calc(100vh-0px)]">
      {/* المنتجات */}
      <div className="p-5">
        <h1 className="text-2xl font-bold mb-3">نقطة البيع (كاشير)</h1>
        {/* تبويبات الأقسام */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
          <TabBtn active={activeCat === "all"} onClick={() => setActiveCat("all")}>الكل</TabBtn>
          {categories.map((c) => (
            <TabBtn key={c.id} active={activeCat === c.id} onClick={() => setActiveCat(c.id)}>
              {c.name_ar}
            </TabBtn>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
          {shown.map((p) => (
            <button
              key={p.id}
              onClick={() => setQty(p.id, (cart[p.id] || 0) + 1)}
              className="text-right rounded-2xl border border-black/10 bg-white overflow-hidden hover:border-brand transition relative"
            >
              <div className="h-24 bg-black/5">
                {p.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full grid place-items-center text-3xl">🍽️</div>
                )}
              </div>
              <div className="p-2">
                <div className="font-semibold text-sm truncate">{p.name_ar}</div>
                <div className="text-brand font-bold text-sm">{p.price} {currency}</div>
              </div>
              {cart[p.id] > 0 && (
                <span className="absolute top-1 left-1 bg-brand text-white text-xs rounded-full w-6 h-6 grid place-items-center font-bold">
                  {cart[p.id]}
                </span>
              )}
            </button>
          ))}
          {shown.length === 0 && <p className="text-black/40 col-span-full">لا منتجات.</p>}
        </div>
      </div>

      {/* التذكرة */}
      <div className="border-r border-black/10 bg-white p-4 flex flex-col lg:h-screen lg:sticky lg:top-0">
        {/* نوع الطلب */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <TypeBtn active={orderType === "dine_in"} onClick={() => setOrderType("dine_in")}>🍽️ صالة</TypeBtn>
          <TypeBtn active={orderType === "takeaway"} onClick={() => setOrderType("takeaway")}>🥡 تيك أواي</TypeBtn>
        </div>
        {orderType === "dine_in" && (
          <select
            value={table}
            onChange={(e) => setTable(e.target.value === "" ? "" : Number(e.target.value))}
            className="mb-3 w-full rounded-lg border border-black/15 px-3 py-2 text-sm"
          >
            {tableNumbers.length === 0 && <option value="">لا توجد ترابيزات</option>}
            {tableNumbers.map((n) => (
              <option key={n} value={n}>ترابيزة رقم {n}</option>
            ))}
          </select>
        )}

        <div className="flex-1 overflow-y-auto -mx-1 px-1">
          {count === 0 ? (
            <p className="text-black/40 text-center py-10 text-sm">أضف منتجات للتذكرة</p>
          ) : (
            <>
              {Object.entries(cart).map(([id, q]) => {
                const p = prodById.get(id);
                if (!p) return null;
                return (
                  <div key={id} className="flex items-center gap-2 py-2 border-b border-black/5">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{p.name_ar}</div>
                      <div className="text-xs text-black/50">{Number(p.price) * q} {currency}</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setQty(id, q - 1)} className="w-6 h-6 rounded-full border grid place-items-center">−</button>
                      <span className="w-5 text-center text-sm font-bold">{q}</span>
                      <button onClick={() => setQty(id, q + 1)} className="w-6 h-6 rounded-full bg-brand text-white grid place-items-center">+</button>
                    </div>
                  </div>
                );
              })}
              {customItems.map((c) => (
                <div key={c.id} className="flex items-center gap-2 py-2 border-b border-black/5">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">
                      {c.name} <span className="text-[10px] text-brand font-normal">مخصّص</span>
                    </div>
                    <div className="text-xs text-black/50">{c.price * c.qty} {currency}</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setCustomQty(c.id, c.qty - 1)} className="w-6 h-6 rounded-full border grid place-items-center">−</button>
                    <span className="w-5 text-center text-sm font-bold">{c.qty}</span>
                    <button onClick={() => setCustomQty(c.id, c.qty + 1)} className="w-6 h-6 rounded-full bg-brand text-white grid place-items-center">+</button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* إضافة صنف مخصّص بسعر يدوي — مثال: بصل زيادة 30ج */}
        <div className="mt-3 flex items-center gap-1.5">
          <input
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCustom()}
            placeholder="صنف مخصّص (بصل زيادة…)"
            className="flex-1 min-w-0 rounded-lg border border-black/15 px-2.5 py-2 text-sm"
          />
          <input
            value={customPrice}
            onChange={(e) => setCustomPrice(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCustom()}
            type="number"
            min={0}
            step="0.5"
            placeholder="السعر"
            className="w-20 rounded-lg border border-black/15 px-2 py-2 text-sm"
          />
          <button
            onClick={addCustom}
            disabled={!customName.trim() || customPrice === ""}
            className="shrink-0 rounded-lg bg-black/80 text-white w-9 h-9 grid place-items-center text-lg disabled:opacity-40"
            title="إضافة صنف مخصّص"
          >
            +
          </button>
        </div>

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="ملاحظات..."
          className="mt-3 w-full rounded-lg border border-black/15 px-3 py-2 text-sm"
        />
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

        <div className="flex items-center justify-between mt-3 text-lg font-extrabold">
          <span>الإجمالي</span>
          <span className="text-brand">{total} {currency}</span>
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-2 mt-3">
          <button
            onClick={submit}
            disabled={pending || count === 0}
            className="rounded-xl bg-green-600 text-white py-3 font-bold hover:bg-green-700 disabled:opacity-50"
          >
            {pending ? "جارٍ الإرسال..." : "🍳 إرسال للمطبخ + إيصال"}
          </button>
          <button onClick={clear} disabled={count === 0} className="rounded-xl border px-4 hover:bg-black/5 disabled:opacity-40">
            مسح
          </button>
        </div>
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold transition ${
        active ? "bg-brand text-white" : "bg-black/5 hover:bg-black/10"
      }`}
    >
      {children}
    </button>
  );
}

function TypeBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg py-2 text-sm font-semibold border transition ${
        active ? "bg-brand text-white border-brand" : "border-black/15 hover:bg-black/5"
      }`}
    >
      {children}
    </button>
  );
}
