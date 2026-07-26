"use client";

import { useActionState } from "react";
import { createRestaurant, type ActionState } from "@/lib/actions/restaurant";
import { BUSINESS_TYPES } from "@/lib/businessType";
import ImageUpload from "@/components/ImageUpload";

export default function OnboardingForm() {
  const [state, action] = useActionState<ActionState, FormData>(createRestaurant, null);

  return (
    <form
      action={action}
      className="mt-6 space-y-4 rounded-2xl border border-black/10 dark:border-white/10 p-6 bg-white/60 dark:bg-white/5"
    >
      <div>
        <label className="block text-sm font-medium mb-2">نوع النشاط</label>
        <div className="grid grid-cols-3 gap-2">
          {BUSINESS_TYPES.map((t, i) => (
            <label
              key={t.value}
              className="flex flex-col items-center gap-1 rounded-lg border border-black/15 dark:border-white/15 px-2 py-3 cursor-pointer text-sm has-[:checked]:border-brand has-[:checked]:bg-brand/5 has-[:checked]:font-bold transition"
            >
              <input
                type="radio"
                name="business_type"
                value={t.value}
                defaultChecked={i === 0}
                className="sr-only"
              />
              <span className="text-xl">{t.emoji}</span>
              {t.label}
            </label>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">اسم النشاط</label>
        <input
          name="name"
          required
          className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:border-brand"
          placeholder="مثال: مطعم وكافيه الأصيل"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">العملة</label>
        <select
          name="currency"
          className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:border-brand"
        >
          <option value="EGP">جنيه مصري (EGP)</option>
          <option value="SAR">ريال سعودي (SAR)</option>
          <option value="AED">درهم إماراتي (AED)</option>
          <option value="USD">دولار (USD)</option>
        </select>
      </div>
      <ImageUpload name="logo_url" folder="logos" label="شعار النشاط (اختياري)" />
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button className="w-full rounded-lg bg-brand text-white py-2.5 font-semibold hover:bg-brand-dark transition">
        إنشاء النشاط
      </button>
    </form>
  );
}
