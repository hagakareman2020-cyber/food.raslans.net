"use client";

import { useActionState, useState } from "react";
import { createBranch, switchBranch, type BranchState } from "@/lib/actions/branch";
import ImageUpload from "@/components/ImageUpload";

type Branch = {
  id: string;
  name: string;
  currency: string;
  logo_url: string | null;
  status: string;
  settings?: { address?: string } | null;
};

const STATUS_LABEL: Record<string, string> = {
  active: "مُفعّل",
  pending: "قيد المراجعة",
  suspended: "موقوف",
};

export default function BranchesManager({
  branches,
  activeId,
}: {
  branches: Branch[];
  activeId: string;
}) {
  const [state, action] = useActionState<BranchState, FormData>(createBranch, null);
  const [menuMode, setMenuMode] = useState<"new" | "same">("new");

  return (
    <div className="space-y-8">
      {/* قائمة الفروع */}
      <section>
        <h2 className="font-bold mb-3">فروعك ({branches.length})</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {branches.map((b) => {
            const isActive = b.id === activeId;
            const address = b.settings?.address;
            return (
              <div
                key={b.id}
                className={`rounded-2xl border p-4 bg-white transition ${
                  isActive ? "border-brand ring-1 ring-brand" : "border-black/10"
                }`}
              >
                <div className="flex items-center gap-2">
                  {b.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.logo_url} alt="" className="w-9 h-9 rounded-lg object-cover" />
                  ) : (
                    <span className="text-2xl">🏬</span>
                  )}
                  <div className="min-w-0">
                    <div className="font-bold truncate">{b.name}</div>
                    <div className="text-xs text-black/50">
                      {b.currency} · {STATUS_LABEL[b.status] ?? b.status}
                    </div>
                  </div>
                </div>

                <div className="text-xs text-black/60 mt-2 flex items-start gap-1">
                  <span>📍</span>
                  <span className="truncate">{address || "— لا يوجد عنوان"}</span>
                </div>

                <div className="mt-3">
                  {isActive ? (
                    <span className="inline-block text-xs font-semibold text-brand">
                      ● الفرع الحالي
                    </span>
                  ) : (
                    <form action={switchBranch}>
                      <input type="hidden" name="branch_id" value={b.id} />
                      <button className="text-sm rounded-lg border border-black/15 px-4 py-1.5 hover:bg-black/5 w-full">
                        الدخول لهذا الفرع
                      </button>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* إضافة فرع */}
      <section className="rounded-2xl border border-black/10 bg-white p-5 max-w-lg">
        <h2 className="font-bold mb-4">➕ إضافة فرع جديد</h2>
        <form action={action} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">اسم الفرع</label>
            <input
              name="name"
              required
              className="w-full rounded-lg border border-black/15 px-3 py-2 outline-none focus:border-brand"
              placeholder="مثال: مطعم البركة — أو — مطعمي الجديد"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">العنوان / المكان</label>
            <input
              name="address"
              className="w-full rounded-lg border border-black/15 px-3 py-2 outline-none focus:border-brand"
              placeholder="مثال: المعادي — شارع 9"
            />
            <p className="text-[11px] text-black/45 mt-1">
              الاسم والمكان منفصلان: سلسلة كـ«البركة» تستخدم نفس الاسم بأماكن مختلفة، ومطاعم مختلفة تستخدم أسماء وأماكن مختلفة.
            </p>
          </div>

          <div>
            <label className="block text-sm mb-1">العملة</label>
            <select name="currency" className="w-full rounded-lg border border-black/15 px-3 py-2 outline-none focus:border-brand">
              <option value="EGP">جنيه مصري (EGP)</option>
              <option value="SAR">ريال سعودي (SAR)</option>
              <option value="AED">درهم إماراتي (AED)</option>
              <option value="USD">دولار (USD)</option>
            </select>
          </div>

          {/* المنيو: جديد أو نسخة من فرع موجود */}
          <div>
            <label className="block text-sm mb-2">منيو الفرع</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm border rounded-lg px-3 py-2 cursor-pointer">
                <input
                  type="radio"
                  name="menu_mode"
                  value="new"
                  checked={menuMode === "new"}
                  onChange={() => setMenuMode("new")}
                />
                منيو جديد فاضي (تبنيه من الصفر)
              </label>
              <label className="flex items-center gap-2 text-sm border rounded-lg px-3 py-2 cursor-pointer">
                <input
                  type="radio"
                  name="menu_mode"
                  value="same"
                  checked={menuMode === "same"}
                  onChange={() => setMenuMode("same")}
                />
                نسخة من منيو فرع موجود (نفس الأصناف والأسعار)
              </label>
            </div>

            {menuMode === "same" && (
              <select
                name="source_branch_id"
                required
                className="mt-2 w-full rounded-lg border border-black/15 px-3 py-2 outline-none focus:border-brand"
              >
                <option value="">— اختر الفرع المصدر —</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                    {b.settings?.address ? ` — ${b.settings.address}` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          <ImageUpload name="logo_url" folder="logos" label="شعار الفرع (اختياري)" />
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          <button className="w-full rounded-lg bg-brand text-white py-2.5 font-semibold hover:bg-brand-dark transition">
            إنشاء الفرع
          </button>
        </form>
        <p className="text-xs text-black/50 mt-3">
          كل فرع له منيوه وأسعاره ومخزونه وترابيزاته وموظفوه بشكل مستقل.
        </p>
      </section>
    </div>
  );
}
