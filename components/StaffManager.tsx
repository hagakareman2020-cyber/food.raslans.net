"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { createStaff, updateStaff, deleteStaff, type StaffActionState } from "@/lib/actions/staff";

const SECTION_OPTIONS = [
  { key: "menu", label: "المنيو" },
  { key: "pos", label: "الكاشير (POS)" },
  { key: "kitchen", label: "المطبخ" },
  { key: "tables", label: "الترابيزات و QR" },
  { key: "analytics", label: "المحاسبة والتحليل" },
  { key: "inventory", label: "المخزون" },
];

const ROLE_LABELS: Record<string, string> = {
  accountant: "محاسب",
  chef: "شيف",
  assistant: "مساعد شيف",
};

type StaffRow = {
  id: string;
  user_id: string;
  email?: string | null;
  role: string;
  sections: string[];
};

export default function StaffManager({ staff }: { staff: StaffRow[] }) {
  const router = useRouter();
  const [state, action] = useActionState<StaffActionState, FormData>(async (prev, fd) => {
    const r = await createStaff(prev, fd);
    if (r?.ok) router.refresh();
    return r;
  }, null);

  return (
    <div className="space-y-8">
      {/* إضافة موظف */}
      <section className="rounded-2xl border border-black/10 bg-white p-5 max-w-2xl">
        <h2 className="font-bold mb-4">➕ إضافة موظف جديد</h2>
        <form action={action} className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">الاسم</label>
            <input name="full_name" className="w-full rounded-lg border border-black/15 px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm mb-1">الدور</label>
            <select name="role" className="w-full rounded-lg border border-black/15 px-3 py-2">
              <option value="accountant">محاسب</option>
              <option value="chef">شيف</option>
              <option value="assistant">مساعد شيف</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">البريد الإلكتروني</label>
            <input name="email" type="email" required className="w-full rounded-lg border border-black/15 px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm mb-1">كلمة المرور</label>
            <input name="password" type="text" required minLength={6} className="w-full rounded-lg border border-black/15 px-3 py-2" placeholder="6 أحرف على الأقل" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm mb-2">الأقسام المصرّح بها</label>
            <div className="flex flex-wrap gap-2">
              {SECTION_OPTIONS.map((s) => (
                <label key={s.key} className="flex items-center gap-1.5 text-sm border rounded-lg px-3 py-1.5 cursor-pointer">
                  <input type="checkbox" name="sections" value={s.key} />
                  {s.label}
                </label>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2 flex items-center gap-3">
            <button className="rounded-lg bg-brand text-white px-6 py-2.5 font-semibold hover:bg-brand-dark">
              إنشاء الحساب
            </button>
            {state?.error && <span className="text-sm text-red-600">{state.error}</span>}
            {state?.ok && <span className="text-sm text-green-600">تم إنشاء الحساب ✓</span>}
          </div>
        </form>
        <p className="text-xs text-black/50 mt-3">
          يسجّل الموظف الدخول بالبريد وكلمة المرور، ويرى فقط الأقسام المصرّح بها.
        </p>
      </section>

      {/* قائمة الموظفين */}
      <section>
        <h2 className="font-bold mb-3">الموظفون ({staff.length})</h2>
        {staff.length === 0 ? (
          <p className="text-black/40 text-sm">لا موظفين بعد.</p>
        ) : (
          <div className="space-y-3">
            {staff.map((s) => (
              <div key={s.id} className="rounded-2xl border border-black/10 bg-white p-4">
                <form action={updateStaff} className="flex flex-wrap items-center gap-3">
                  <input type="hidden" name="id" value={s.id} />
                  <div className="min-w-40">
                    <div className="font-bold">{s.email}</div>
                    <div className="text-xs text-black/50">{ROLE_LABELS[s.role] ?? s.role}</div>
                  </div>
                  <select name="role" defaultValue={s.role} className="rounded-lg border border-black/15 px-2 py-1.5 text-sm">
                    <option value="accountant">محاسب</option>
                    <option value="chef">شيف</option>
                    <option value="assistant">مساعد شيف</option>
                  </select>
                  <div className="flex flex-wrap gap-1.5">
                    {SECTION_OPTIONS.map((sec) => (
                      <label key={sec.key} className="flex items-center gap-1 text-xs border rounded px-2 py-1 cursor-pointer">
                        <input type="checkbox" name="sections" value={sec.key} defaultChecked={s.sections?.includes(sec.key)} />
                        {sec.label}
                      </label>
                    ))}
                  </div>
                  <button className="text-xs rounded-lg bg-brand text-white px-3 py-1.5">حفظ</button>
                </form>
                <form action={deleteStaff} className="mt-2">
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="user_id" value={s.user_id} />
                  <button className="text-xs text-red-600 hover:underline">حذف الموظف</button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
