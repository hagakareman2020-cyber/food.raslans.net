import { requireOwner } from "@/lib/access";
import { updateWaterSettings, updateBusinessSettings } from "@/lib/actions/restaurant";
import { waterConfig } from "@/lib/water";
import { BUSINESS_TYPES, getBusinessType, businessLabels } from "@/lib/businessType";

const CURRENCIES = [
  { value: "EGP", label: "جنيه مصري (EGP)" },
  { value: "SAR", label: "ريال سعودي (SAR)" },
  { value: "AED", label: "درهم إماراتي (AED)" },
  { value: "USD", label: "دولار (USD)" },
];

export default async function SettingsPage() {
  const restaurant = await requireOwner();
  const water = waterConfig(restaurant.settings);
  const currentType = getBusinessType(restaurant.settings);
  const labels = businessLabels(restaurant.settings);

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-1">الإعدادات</h1>
      <p className="text-black/60 mb-6">إعدادات عامة لـ{labels.yourPlace}.</p>

      <form action={updateBusinessSettings} className="rounded-2xl border border-black/10 bg-white p-6 space-y-4 mb-6">
        <h2 className="font-bold">🏷️ بيانات النشاط</h2>
        <div>
          <label className="block text-sm font-medium mb-2">نوع النشاط</label>
          <div className="grid grid-cols-3 gap-2">
            {BUSINESS_TYPES.map((t) => (
              <label
                key={t.value}
                className="flex flex-col items-center gap-1 rounded-lg border border-black/15 px-2 py-3 cursor-pointer text-sm has-[:checked]:border-brand has-[:checked]:bg-brand/5 has-[:checked]:font-bold transition"
              >
                <input
                  type="radio"
                  name="business_type"
                  value={t.value}
                  defaultChecked={t.value === currentType}
                  className="sr-only"
                />
                <span className="text-xl">{t.emoji}</span>
                {t.label}
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm mb-1">اسم النشاط / الفرع</label>
          <input
            name="name"
            defaultValue={restaurant.name}
            className="w-full rounded-lg border border-black/15 px-3 py-2 outline-none focus:border-brand"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">عنوان الفرع (يظهر في قائمة الفروع)</label>
          <input
            name="address"
            defaultValue={restaurant.settings?.address ?? ""}
            placeholder="مثال: المهندسين"
            className="w-full rounded-lg border border-black/15 px-3 py-2 outline-none focus:border-brand"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">العملة</label>
          <select
            name="currency"
            defaultValue={restaurant.currency}
            className="w-full rounded-lg border border-black/15 px-3 py-2 outline-none focus:border-brand"
          >
            {CURRENCIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <button className="rounded-lg bg-brand text-white px-6 py-2.5 font-semibold hover:bg-brand-dark">
          حفظ بيانات النشاط
        </button>
      </form>

      <form action={updateWaterSettings} className="rounded-2xl border border-black/10 bg-white p-6 space-y-4">
        <h2 className="font-bold">💧 المياه المضافة تلقائياً</h2>
        <p className="text-sm text-black/55">
          تُضاف هذه الزجاجات تلقائياً لكل طلب (من العميل أو الكاشير). اجعل السعر صفراً لتكون مجانية.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">عدد الزجاجات لكل طلب</label>
            <input
              type="number"
              name="water_bottles"
              min={0}
              max={10}
              defaultValue={water.bottles}
              className="w-full rounded-lg border border-black/15 px-3 py-2 outline-none focus:border-brand"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">سعر الزجاجة ({restaurant.currency})</label>
            <input
              type="number"
              name="water_price"
              min={0}
              step="0.5"
              defaultValue={water.price}
              className="w-full rounded-lg border border-black/15 px-3 py-2 outline-none focus:border-brand"
            />
          </div>
        </div>
        <button className="rounded-lg bg-brand text-white px-6 py-2.5 font-semibold hover:bg-brand-dark">
          حفظ
        </button>
      </form>
    </div>
  );
}
