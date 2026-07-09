"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createCategory,
  createProduct,
  deleteCategory,
  deleteProduct,
  toggleProductAvailability,
  type ActionState,
} from "@/lib/actions/menu";
import { linkIngredient, unlinkIngredient } from "@/lib/actions/inventory";
import ImageUpload from "@/components/ImageUpload";
import { TAG_LABELS, type Category, type Product, type ProductTag } from "@/lib/types";

type InventoryItem = { id: string; name: string; unit: string };
type IngredientLink = { product_id: string; inventory_item_id: string; amount: number };

export default function MenuManager({
  restaurantId,
  currency,
  categories,
  products,
  inventoryItems,
  ingredientLinks,
}: {
  restaurantId: string;
  currency: string;
  categories: Category[];
  products: Product[];
  inventoryItems: InventoryItem[];
  ingredientLinks: IngredientLink[];
}) {
  const router = useRouter();
  const [showProductForm, setShowProductForm] = useState(false);
  const [openIngredients, setOpenIngredients] = useState<string | null>(null);

  const itemName = (id: string) => inventoryItems.find((i) => i.id === id)?.name ?? "—";
  const linksFor = (productId: string) =>
    ingredientLinks.filter((l) => l.product_id === productId);

  const [catState, catAction] = useActionState<ActionState, FormData>(
    async (prev, fd) => {
      const r = await createCategory(prev, fd);
      if (r?.ok) router.refresh();
      return r;
    },
    null
  );

  const [prodState, prodAction] = useActionState<ActionState, FormData>(
    async (prev, fd) => {
      const r = await createProduct(prev, fd);
      if (r?.ok) {
        setShowProductForm(false);
        router.refresh();
      }
      return r;
    },
    null
  );

  return (
    <div className="space-y-8">
      {/* إضافة قسم */}
      <section className="rounded-2xl border border-black/10 dark:border-white/10 p-5 bg-white/60 dark:bg-white/5">
        <h2 className="font-bold mb-3">➕ إضافة قسم</h2>
        <form action={catAction} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="restaurant_id" value={restaurantId} />
          <div>
            <label className="block text-xs mb-1">الاسم بالعربية</label>
            <input
              name="name_ar"
              required
              placeholder="مثال: المشروبات"
              className="rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:border-brand"
            />
          </div>
          <div>
            <label className="block text-xs mb-1">الاسم بالإنجليزية (اختياري)</label>
            <input
              name="name_en"
              placeholder="Beverages"
              className="rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:border-brand"
            />
          </div>
          <button className="rounded-lg bg-brand text-white px-5 py-2 font-semibold hover:bg-brand-dark transition">
            إضافة
          </button>
          {catState?.error && <span className="text-sm text-red-600">{catState.error}</span>}
        </form>
      </section>

      {/* زر إضافة منتج */}
      <div>
        <button
          onClick={() => setShowProductForm((v) => !v)}
          disabled={categories.length === 0}
          className="rounded-lg bg-brand text-white px-5 py-2.5 font-semibold hover:bg-brand-dark transition disabled:opacity-50"
        >
          {showProductForm ? "إغلاق" : "➕ إضافة منتج"}
        </button>
        {categories.length === 0 && (
          <span className="text-sm text-black/50 mr-3">أضف قسماً أولاً</span>
        )}
      </div>

      {/* فورم إضافة منتج */}
      {showProductForm && (
        <section className="rounded-2xl border border-brand/40 p-5 bg-white/60 dark:bg-white/5">
          <h2 className="font-bold mb-4">منتج جديد</h2>
          <form action={prodAction} className="grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="restaurant_id" value={restaurantId} />
            <div>
              <label className="block text-sm mb-1">الاسم بالعربية *</label>
              <input name="name_ar" required className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm mb-1">الاسم بالإنجليزية</label>
              <input name="name_en" className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm mb-1">القسم</label>
              <select name="category_id" className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2">
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name_ar}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">السعر ({currency})</label>
              <input name="price" type="number" step="0.01" min="0" defaultValue={0} className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm mb-1">المكونات</label>
              <textarea name="ingredients" rows={2} className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm mb-1">مدة التحضير (دقائق)</label>
              <input name="prep_minutes" type="number" min="1" defaultValue={10} className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2" />
            </div>
            <div>
              <ImageUpload name="image_url" folder="products" label="صورة المنتج" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm mb-2">وسوم تحذيرية / غذائية</label>
              <div className="flex flex-wrap gap-3">
                {(Object.keys(TAG_LABELS) as ProductTag[]).map((t) => (
                  <label key={t} className="flex items-center gap-1.5 text-sm border rounded-lg px-3 py-1.5 cursor-pointer">
                    <input type="checkbox" name="tags" value={t} />
                    {TAG_LABELS[t]}
                  </label>
                ))}
              </div>
            </div>
            <div className="sm:col-span-2 flex items-center gap-3">
              <button className="rounded-lg bg-brand text-white px-6 py-2.5 font-semibold hover:bg-brand-dark transition">
                حفظ المنتج
              </button>
              {prodState?.error && <span className="text-sm text-red-600">{prodState.error}</span>}
            </div>
          </form>
        </section>
      )}

      {/* قائمة الأقسام والمنتجات */}
      <section className="space-y-6">
        {categories.length === 0 && (
          <p className="text-black/50">لا توجد أقسام بعد.</p>
        )}
        {categories.map((cat) => {
          const items = products.filter((p) => p.category_id === cat.id);
          return (
            <div key={cat.id} className="rounded-2xl border border-black/10 dark:border-white/10 overflow-hidden">
              <div className="flex items-center justify-between bg-black/[0.03] dark:bg-white/5 px-4 py-3">
                <h3 className="font-bold">
                  {cat.name_ar}
                  <span className="text-black/40 text-sm mr-2">({items.length})</span>
                </h3>
                <form action={deleteCategory}>
                  <input type="hidden" name="id" value={cat.id} />
                  <button className="text-sm text-red-600 hover:underline">حذف القسم</button>
                </form>
              </div>
              <div className="divide-y divide-black/5 dark:divide-white/5">
                {items.length === 0 && (
                  <p className="px-4 py-3 text-sm text-black/40">لا منتجات في هذا القسم.</p>
                )}
                {items.map((p) => (
                  <div key={p.id}>
                  <div className="flex items-center gap-4 px-4 py-3">
                    {p.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-black/5 dark:bg-white/10 grid place-items-center">🍽️</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold flex items-center gap-2 flex-wrap">
                        {p.name_ar}
                        {!p.is_available && (
                          <span className="text-[10px] bg-red-100 text-red-700 rounded px-1.5">مخفي</span>
                        )}
                        {p.tags.map((t) => (
                          <span key={t} className="text-[10px] bg-black/5 dark:bg-white/10 rounded px-1.5">
                            {TAG_LABELS[t]}
                          </span>
                        ))}
                      </div>
                      {p.ingredients && (
                        <div className="text-xs text-black/50 truncate">{p.ingredients}</div>
                      )}
                      <div className="text-xs text-black/50">⏱️ {p.prep_minutes} دقيقة</div>
                    </div>
                    <div className="font-bold text-brand whitespace-nowrap">
                      {p.price} {currency}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setOpenIngredients((v) => (v === p.id ? null : p.id))}
                        className={`text-xs rounded border px-2 py-1 hover:bg-black/5 ${!p.in_stock ? "border-red-300 text-red-700" : ""}`}
                      >
                        🔗 الخامات ({linksFor(p.id).length})
                      </button>
                      <form action={toggleProductAvailability}>
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="value" value={(!p.is_available).toString()} />
                        <button className="text-xs rounded border px-2 py-1 hover:bg-black/5">
                          {p.is_available ? "إخفاء" : "إظهار"}
                        </button>
                      </form>
                      <form action={deleteProduct}>
                        <input type="hidden" name="id" value={p.id} />
                        <button className="text-xs text-red-600 hover:underline">حذف</button>
                      </form>
                    </div>
                  </div>
                  {openIngredients === p.id && (
                    <div className="px-4 pb-3 bg-black/[0.02] dark:bg-white/5">
                      <div className="text-xs text-black/50 mb-2">
                        الخامات المستهلكة لكل وحدة من «{p.name_ar}». عند نفاد أي خامة يُخفى المنتج تلقائياً.
                      </div>
                      {inventoryItems.length === 0 ? (
                        <p className="text-xs text-black/40">أضف خامات في قسم «المخزون» أولاً.</p>
                      ) : (
                        <>
                          <form action={linkIngredient} className="flex flex-wrap items-end gap-2 mb-2">
                            <input type="hidden" name="product_id" value={p.id} />
                            <select
                              name="inventory_item_id"
                              className="rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-2 py-1.5 text-sm"
                            >
                              {inventoryItems.map((i) => (
                                <option key={i.id} value={i.id}>
                                  {i.name}
                                </option>
                              ))}
                            </select>
                            <input
                              name="amount"
                              type="number"
                              step="0.01"
                              min="0"
                              defaultValue={1}
                              className="w-20 rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-2 py-1.5 text-sm"
                            />
                            <button className="text-xs rounded-lg bg-brand text-white px-3 py-1.5">
                              ربط الخامة
                            </button>
                          </form>
                          <div className="flex flex-wrap gap-2">
                            {linksFor(p.id).length === 0 && (
                              <span className="text-xs text-black/40">لا خامات مربوطة بهذا المنتج.</span>
                            )}
                            {linksFor(p.id).map((l) => (
                              <span
                                key={l.inventory_item_id}
                                className="inline-flex items-center gap-1 text-xs bg-black/5 dark:bg-white/10 rounded-lg px-2 py-1"
                              >
                                {itemName(l.inventory_item_id)} × {l.amount}
                                <form action={unlinkIngredient}>
                                  <input type="hidden" name="product_id" value={p.id} />
                                  <input type="hidden" name="inventory_item_id" value={l.inventory_item_id} />
                                  <button className="text-red-600" title="فك الربط">
                                    ✕
                                  </button>
                                </form>
                              </span>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
