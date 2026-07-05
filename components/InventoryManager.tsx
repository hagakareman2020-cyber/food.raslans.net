"use client";

import {
  createInventoryItem,
  updateInventoryQty,
  deleteInventoryItem,
  linkIngredient,
  unlinkIngredient,
} from "@/lib/actions/inventory";

type Item = { id: string; name: string; quantity: number; unit: string; low_threshold: number };
type Prod = { id: string; name_ar: string; in_stock: boolean };
type Link = { product_id: string; inventory_item_id: string; amount: number };

export default function InventoryManager({
  items,
  products,
  links,
}: {
  items: Item[];
  products: Prod[];
  links: Link[];
}) {
  const itemName = (id: string) => items.find((i) => i.id === id)?.name ?? "—";

  return (
    <div className="space-y-8">
      {/* إضافة خامة */}
      <section className="rounded-2xl border border-black/10 bg-white p-5">
        <h2 className="font-bold mb-3">➕ إضافة خامة للمخزون</h2>
        <form action={createInventoryItem} className="flex flex-wrap items-end gap-3">
          <Field label="اسم الخامة"><input name="name" required className="inp" placeholder="مثال: خبز" /></Field>
          <Field label="الكمية"><input name="quantity" type="number" step="0.01" defaultValue={0} className="inp w-24" /></Field>
          <Field label="الوحدة"><input name="unit" defaultValue="قطعة" className="inp w-24" /></Field>
          <Field label="حد التنبيه"><input name="low_threshold" type="number" step="0.01" defaultValue={5} className="inp w-24" /></Field>
          <button className="btn-brand">إضافة</button>
        </form>
      </section>

      {/* قائمة الخامات */}
      <section>
        <h2 className="font-bold mb-3">الخامات ({items.length})</h2>
        {items.length === 0 ? (
          <p className="text-black/40 text-sm">لا خامات بعد.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((it) => {
              const low = Number(it.quantity) <= Number(it.low_threshold);
              return (
                <div key={it.id} className={`rounded-2xl border p-4 bg-white ${low ? "border-red-300" : "border-black/10"}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{it.name}</span>
                    {low && <span className="text-[10px] bg-red-100 text-red-700 rounded px-1.5">منخفض ⚠️</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <form action={updateInventoryQty} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={it.id} />
                      <input name="quantity" type="number" step="0.01" defaultValue={it.quantity} className="inp w-24" />
                      <span className="text-sm text-black/50">{it.unit}</span>
                      <button className="text-xs rounded-lg bg-brand text-white px-3 py-1.5">حفظ</button>
                    </form>
                    <form action={deleteInventoryItem}>
                      <input type="hidden" name="id" value={it.id} />
                      <button className="text-xs text-red-600 hover:underline">حذف</button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ربط المنتجات بالخامات */}
      <section className="rounded-2xl border border-black/10 bg-white p-5">
        <h2 className="font-bold mb-1">🔗 ربط المنتجات بالمخزون</h2>
        <p className="text-sm text-black/55 mb-4">
          حدّد الخامات المستهلكة لكل منتج. عند نفاد أي خامة، يُخفى المنتج تلقائياً من المنيو.
        </p>

        {items.length === 0 || products.length === 0 ? (
          <p className="text-black/40 text-sm">أضف خامات ومنتجات أولاً.</p>
        ) : (
          <form action={linkIngredient} className="flex flex-wrap items-end gap-3 mb-5">
            <Field label="المنتج">
              <select name="product_id" className="inp">
                {products.map((p) => (<option key={p.id} value={p.id}>{p.name_ar}</option>))}
              </select>
            </Field>
            <Field label="الخامة">
              <select name="inventory_item_id" className="inp">
                {items.map((i) => (<option key={i.id} value={i.id}>{i.name}</option>))}
              </select>
            </Field>
            <Field label="الكمية المستهلكة"><input name="amount" type="number" step="0.01" defaultValue={1} className="inp w-24" /></Field>
            <button className="btn-brand">ربط</button>
          </form>
        )}

        <div className="space-y-3">
          {products.map((p) => {
            const pLinks = links.filter((l) => l.product_id === p.id);
            if (pLinks.length === 0) return null;
            return (
              <div key={p.id} className="flex items-start gap-2 border-t border-black/5 pt-2">
                <span className="font-semibold text-sm min-w-24">
                  {p.name_ar}
                  {!p.in_stock && <span className="text-[10px] bg-red-100 text-red-700 rounded px-1 mr-1">نفد</span>}
                </span>
                <div className="flex flex-wrap gap-2">
                  {pLinks.map((l) => (
                    <span key={l.inventory_item_id} className="inline-flex items-center gap-1 text-xs bg-black/5 rounded-lg px-2 py-1">
                      {itemName(l.inventory_item_id)} × {l.amount}
                      <form action={unlinkIngredient}>
                        <input type="hidden" name="product_id" value={p.id} />
                        <input type="hidden" name="inventory_item_id" value={l.inventory_item_id} />
                        <button className="text-red-600">✕</button>
                      </form>
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <style>{`
        .inp { border:1px solid rgba(0,0,0,0.15); border-radius:0.5rem; padding:0.5rem 0.75rem; outline:none; }
        .inp:focus { border-color:#c2410c; }
        .btn-brand { background:#c2410c; color:#fff; border-radius:0.5rem; padding:0.5rem 1.25rem; font-weight:600; }
        .btn-brand:hover { background:#9a3412; }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs mb-1">{label}</label>
      {children}
    </div>
  );
}
