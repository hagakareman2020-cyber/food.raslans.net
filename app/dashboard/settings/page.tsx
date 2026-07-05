import { requireOwner } from "@/lib/access";
import { updateWaterSettings } from "@/lib/actions/restaurant";
import { waterConfig } from "@/lib/water";

export default async function SettingsPage() {
  const restaurant = await requireOwner();
  const water = waterConfig(restaurant.settings);

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-1">الإعدادات</h1>
      <p className="text-black/60 mb-6">إعدادات عامة لمطعمك.</p>

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
