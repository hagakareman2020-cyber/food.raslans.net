import { requireOwner } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import StaffManager from "@/components/StaffManager";
import { updateStaffPayroll } from "@/lib/actions/staff";
import { resetStaffDevice } from "@/lib/actions/attendance";
import { hasFaceEnrolled } from "@/lib/attendanceLogic";

const WEEKDAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

type StaffFull = {
  id: string;
  user_id: string;
  role: string;
  sections: string[];
  base_salary: number;
  work_days_per_month: number;
  work_weekdays: number[] | null;
  absence_compensation: boolean;
  late_policy_id: string | null;
  overtime_policy_id: string | null;
  device_id: string | null;
  face_descriptor: unknown;
};

export default async function StaffPage() {
  const restaurant = await requireOwner();
  const admin = createAdminClient();
  const supabase = await createClient();

  const { data: staff } = await admin
    .from("staff")
    .select(
      "id, user_id, role, sections, base_salary, work_days_per_month, work_weekdays, absence_compensation, late_policy_id, overtime_policy_id, device_id, face_descriptor"
    )
    .eq("restaurant_id", restaurant.id)
    .order("created_at");

  const { data: policies } = await supabase
    .from("policies")
    .select("id, name, kind")
    .eq("restaurant_id", restaurant.id);
  const latePolicies = (policies ?? []).filter((p) => p.kind === "late");
  const otPolicies = (policies ?? []).filter((p) => p.kind === "overtime");

  const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const emailById = new Map(users?.users.map((u) => [u.id, u.email]) ?? []);
  const nameById = new Map(users?.users.map((u) => [u.id, (u.user_metadata as { full_name?: string })?.full_name]) ?? []);

  const full = (staff as StaffFull[]) ?? [];
  const list = full.map((s) => ({
    id: s.id,
    user_id: s.user_id,
    role: s.role,
    sections: (s.sections as string[]) ?? [],
    email: emailById.get(s.user_id) ?? null,
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">الموظفون والصلاحيات</h1>
      <p className="text-black/60 mb-1">
        أنشئ حسابات لموظفيك (كاشير، شيف، محاسب) وحدّد الأقسام التي يصل إليها كل موظف.
      </p>
      <p className="text-sm mb-6">
        <span className="text-black/50">الموظفون التالون تابعون لفرع: </span>
        <span className="font-bold text-brand">{restaurant.name}</span>
        <span className="text-black/50"> — بدّل الفرع من القائمة الجانبية لإدارة موظفي فرع آخر.</span>
      </p>
      <StaffManager staff={list} />

      {/* الرواتب والجداول وبصمة الوجه والجهاز */}
      <h2 className="text-xl font-bold mt-10 mb-1">الرواتب والجداول</h2>
      <p className="text-black/55 text-sm mb-4">
        اضبط الراتب وأيام العمل وسياسات التأخير/الأوفرتايم لكل موظف — تُستخدم في صفحة الرواتب.
      </p>
      {full.length === 0 ? (
        <p className="text-black/40 text-sm">لا يوجد موظفون بعد.</p>
      ) : (
        <div className="space-y-4">
          {full.map((s) => {
            const name = nameById.get(s.user_id) || emailById.get(s.user_id) || "موظف";
            const days = s.work_weekdays ?? [];
            return (
              <form
                key={s.id}
                action={updateStaffPayroll}
                className="rounded-2xl border border-black/10 bg-white p-5"
              >
                <input type="hidden" name="id" value={s.id} />
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <div className="font-bold">
                    {name}
                    {hasFaceEnrolled(s.face_descriptor) && <span className="ms-2 text-xs text-green-600">🙂 بصمة مسجّلة</span>}
                    {s.device_id && <span className="ms-2 text-xs text-black/40">📱 جهاز مربوط</span>}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <label className="text-xs text-black/50">الراتب الأساسي ({restaurant.currency})
                    <input type="number" name="base_salary" min={0} step="1" defaultValue={s.base_salary ?? 0} className="mt-1 w-full rounded-lg border border-black/15 px-2 py-2 text-sm" />
                  </label>
                  <label className="text-xs text-black/50">أيام العمل بالشهر (لأجر اليوم)
                    <input type="number" name="work_days_per_month" min={1} max={31} defaultValue={s.work_days_per_month ?? 26} className="mt-1 w-full rounded-lg border border-black/15 px-2 py-2 text-sm" />
                  </label>
                  <label className="text-xs text-black/50">سياسة التأخير
                    <select name="late_policy_id" defaultValue={s.late_policy_id ?? ""} className="mt-1 w-full rounded-lg border border-black/15 px-2 py-2 text-sm">
                      <option value="">الافتراضية</option>
                      {latePolicies.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </label>
                  <label className="text-xs text-black/50">سياسة الأوفرتايم
                    <select name="overtime_policy_id" defaultValue={s.overtime_policy_id ?? ""} className="mt-1 w-full rounded-lg border border-black/15 px-2 py-2 text-sm">
                      <option value="">الافتراضية</option>
                      {otPolicies.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </label>
                </div>

                <div className="mt-3">
                  <div className="text-xs text-black/50 mb-1">أيام الدوام الثابتة (لحساب الغياب — اتركها فارغة لدوام مرن)</div>
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAYS.map((d, i) => (
                      <label key={i} className="flex items-center gap-1 text-xs rounded-lg border border-black/15 px-2 py-1.5 cursor-pointer has-[:checked]:border-brand has-[:checked]:bg-brand/5">
                        <input type="checkbox" name="work_weekdays" value={i} defaultChecked={days.includes(i)} className="accent-brand" />
                        {d}
                      </label>
                    ))}
                  </div>
                </div>

                <label className="mt-3 flex items-center gap-2 text-sm cursor-pointer select-none">
                  <input type="checkbox" name="absence_compensation" value="1" defaultChecked={s.absence_compensation} className="accent-brand w-4 h-4" />
                  تفعيل تعويض الغياب (كل يومين إضافيين يعوّضان غياب يوم)
                </label>

                <div className="mt-4 flex items-center gap-2">
                  <button className="rounded-lg bg-brand text-white px-5 py-2 text-sm font-semibold hover:bg-brand-dark">حفظ</button>
                </div>
              </form>
            );
          })}

          {/* إعادة تعيين الأجهزة */}
          {full.some((s) => s.device_id) && (
            <div className="rounded-2xl border border-black/10 bg-white p-5">
              <h3 className="font-bold mb-2">📱 الأجهزة المربوطة</h3>
              <div className="space-y-2">
                {full.filter((s) => s.device_id).map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-sm">
                    <span>{nameById.get(s.user_id) || emailById.get(s.user_id) || "موظف"}</span>
                    <form action={resetStaffDevice}>
                      <input type="hidden" name="staff_id" value={s.id} />
                      <button className="text-xs text-red-600 hover:underline">إعادة تعيين الجهاز</button>
                    </form>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
