import { requireOwner } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { selectPolicyRule, resolvePolicyEffect, type PolicyRule } from "@/lib/policyEngine";
import { addPayrollTransaction, deletePayrollTransaction } from "@/lib/actions/payroll";

type Staff = {
  id: string;
  user_id: string;
  base_salary: number;
  work_days_per_month: number;
  work_weekdays: number[] | null;
  absence_compensation: boolean;
  late_policy_id: string | null;
  overtime_policy_id: string | null;
};
type Policy = { id: string; kind: string; is_default: boolean; policy_rules: PolicyRule[] };
type Att = { user_id: string; work_date: string; late_minutes: number | null; overtime_minutes: number | null };
type Tx = { id: string; staff_id: string; kind: string; amount: number; note: string | null };

const KIND_AR: Record<string, string> = { bonus: "مكافأة", allowance: "بدل", deduction: "خصم", other: "أخرى" };

function monthRange(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  const last = new Date(y, m, 0).getDate();
  return { from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-${pad(last)}` };
}
function weekdayOf(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}
function countExpectedDays(from: string, to: string, weekdays: number[] | null) {
  if (!Array.isArray(weekdays) || weekdays.length === 0) return null;
  let count = 0;
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  const d = new Date(fy, fm - 1, fd);
  const end = new Date(ty, tm - 1, td);
  for (; d <= end; d.setDate(d.getDate() + 1)) if (weekdays.includes(d.getDay())) count++;
  return count;
}

export default async function PayrollPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const restaurant = await requireOwner();
  const supabase = await createClient();
  const now = new Date();
  const sp = await searchParams;
  const month = sp.month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const { from, to } = monthRange(month);
  const currency = restaurant.currency;

  const [{ data: staffData }, { data: attData }, { data: polData }, { data: txData }] = await Promise.all([
    supabase
      .from("staff")
      .select("id, user_id, base_salary, work_days_per_month, work_weekdays, absence_compensation, late_policy_id, overtime_policy_id")
      .eq("restaurant_id", restaurant.id),
    supabase
      .from("attendance")
      .select("user_id, work_date, late_minutes, overtime_minutes")
      .eq("restaurant_id", restaurant.id)
      .gte("work_date", from)
      .lte("work_date", to),
    supabase.from("policies").select("id, kind, is_default, policy_rules(from_value, to_value, action, amount)").eq("restaurant_id", restaurant.id),
    supabase.from("payroll_transactions").select("id, staff_id, kind, amount, note").eq("restaurant_id", restaurant.id).gte("ref_date", from).lte("ref_date", to),
  ]);

  const staff = (staffData as Staff[]) ?? [];
  const att = (attData as Att[]) ?? [];
  const policies = (polData as Policy[]) ?? [];
  const txs = (txData as Tx[]) ?? [];

  // أسماء الموظفين
  const nameMap = new Map<string, string>();
  if (staff.length) {
    const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", staff.map((s) => s.user_id));
    (profs ?? []).forEach((p: { id: string; full_name: string | null }) => nameMap.set(p.id, p.full_name || "موظف"));
  }

  const polMap = new Map(policies.map((p) => [p.id, p]));
  const defLate = policies.find((p) => p.kind === "late" && p.is_default);
  const defOt = policies.find((p) => p.kind === "overtime" && p.is_default);
  const rulesOf = (id: string | null | undefined) => (id ? polMap.get(id)?.policy_rules ?? [] : []);

  const txByStaff = new Map<string, Tx[]>();
  for (const t of txs) {
    if (!txByStaff.has(t.staff_id)) txByStaff.set(t.staff_id, []);
    txByStaff.get(t.staff_id)!.push(t);
  }

  const money = (n: number) => `${(Math.round(n * 100) / 100).toLocaleString("en-US")} ${currency}`;

  function computeRow(s: Staff) {
    const base = Number(s.base_salary) || 0;
    const workDays = Number(s.work_days_per_month) || 26;
    const dailyRate = workDays ? base / workDays : 0;
    const recs = att.filter((r) => r.user_id === s.user_id);

    const lateRules = rulesOf(s.late_policy_id).length ? rulesOf(s.late_policy_id) : rulesOf(defLate?.id);
    const otRules = rulesOf(s.overtime_policy_id).length ? rulesOf(s.overtime_policy_id) : rulesOf(defOt?.id);

    let lateDed = 0;
    let otBonus = 0;
    for (const r of recs) {
      if ((r.late_minutes ?? 0) > 0 && lateRules.length)
        lateDed += resolvePolicyEffect(selectPolicyRule(lateRules, r.late_minutes!), { dailyRate }).amount;
      if ((r.overtime_minutes ?? 0) > 0 && otRules.length)
        otBonus += resolvePolicyEffect(selectPolicyRule(otRules, (r.overtime_minutes ?? 0) / 60), { dailyRate }).amount;
    }

    const presentDates = new Set(recs.map((r) => r.work_date));
    const expected = countExpectedDays(from, to, s.work_weekdays);
    let absentDays = expected == null ? 0 : Math.max(0, expected - presentDates.size);

    if (s.absence_compensation && Array.isArray(s.work_weekdays) && s.work_weekdays.length) {
      let scheduledPresent = 0;
      let extraDays = 0;
      for (const date of presentDates) {
        if (s.work_weekdays.includes(weekdayOf(date))) scheduledPresent++;
        else extraDays++;
      }
      const rawAbsences = Math.max(0, (expected || 0) - scheduledPresent);
      const compsUsed = Math.min(rawAbsences, Math.floor(extraDays / 2));
      const net = rawAbsences - compsUsed;
      absentDays = net === 0 ? 0 : 1 + (net - 1) * 2;
    }
    const absenceDed = -(absentDays * dailyRate);
    const manualSum = (txByStaff.get(s.id) || []).reduce((a, t) => a + Number(t.amount), 0);
    const net = base + lateDed + otBonus + absenceDed + manualSum;
    return { base, lateDed, otBonus, absentDays, absenceDed, manualSum, net };
  }

  const rows = staff.map((s) => ({ s, calc: computeRow(s) }));

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-1">
        <h1 className="text-2xl font-bold">الرواتب</h1>
        <form className="flex items-end gap-2">
          <input type="month" name="month" defaultValue={month} className="rounded-lg border border-black/15 px-3 py-2 text-sm" dir="ltr" />
          <button className="rounded-lg bg-brand text-white px-4 py-2 text-sm font-semibold hover:bg-brand-dark">عرض</button>
        </form>
      </div>
      <p className="text-black/60 mb-6">حساب تلقائي من الحضور والسياسات + المعاملات اليدوية.</p>

      {rows.length === 0 ? (
        <p className="text-black/40 py-8 text-center rounded-2xl border border-black/10 bg-white">لا يوجد موظفون في هذا الفرع.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-black/10 bg-white mb-8">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-black/50 border-b border-black/10">
                <th className="text-right p-3 font-semibold">الموظف</th>
                <th className="text-center p-3 font-semibold">الأساسي</th>
                <th className="text-center p-3 font-semibold">خصم تأخير</th>
                <th className="text-center p-3 font-semibold">أوفرتايم</th>
                <th className="text-center p-3 font-semibold">خصم غياب</th>
                <th className="text-center p-3 font-semibold">يدوي</th>
                <th className="text-center p-3 font-semibold">الصافي</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ s, calc }) => (
                <tr key={s.id} className="border-b border-black/5 last:border-0">
                  <td className="p-3 font-semibold">{nameMap.get(s.user_id) || "موظف"}</td>
                  <td className="p-3 text-center">{money(calc.base)}</td>
                  <td className="p-3 text-center text-red-600">{calc.lateDed ? money(calc.lateDed) : "—"}</td>
                  <td className="p-3 text-center text-green-600">{calc.otBonus ? money(calc.otBonus) : "—"}</td>
                  <td className="p-3 text-center text-red-600">{calc.absenceDed ? money(calc.absenceDed) : "—"}</td>
                  <td className="p-3 text-center">{calc.manualSum ? money(calc.manualSum) : "—"}</td>
                  <td className="p-3 text-center font-bold">{money(calc.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* المعاملات اليدوية */}
      <h2 className="font-bold mb-3">معاملات يدوية — {month}</h2>
      <form action={addPayrollTransaction} className="rounded-2xl border border-black/10 bg-white p-5 mb-4 grid grid-cols-2 md:grid-cols-5 gap-2 items-end">
        <input type="hidden" name="ref_date" value={to} />
        <label className="text-xs text-black/50">الموظف
          <select name="staff_id" required className="mt-1 w-full rounded-lg border border-black/15 px-2 py-2 text-sm">
            {staff.map((s) => (
              <option key={s.id} value={s.id}>{nameMap.get(s.user_id) || "موظف"}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-black/50">النوع
          <select name="kind" className="mt-1 w-full rounded-lg border border-black/15 px-2 py-2 text-sm">
            {Object.entries(KIND_AR).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-black/50">المبلغ
          <input type="number" name="amount" min={0} step="0.5" required className="mt-1 w-full rounded-lg border border-black/15 px-2 py-2 text-sm" />
        </label>
        <label className="text-xs text-black/50">ملاحظة
          <input name="note" className="mt-1 w-full rounded-lg border border-black/15 px-2 py-2 text-sm" />
        </label>
        <button className="rounded-lg bg-brand text-white px-4 py-2 text-sm font-semibold hover:bg-brand-dark">إضافة</button>
      </form>

      {txs.length > 0 && (
        <div className="rounded-2xl border border-black/10 bg-white divide-y divide-black/5">
          {txs.map((t) => (
            <div key={t.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span>
                <b>{nameMap.get(staff.find((s) => s.id === t.staff_id)?.user_id || "") || "موظف"}</b> ·{" "}
                {KIND_AR[t.kind] || t.kind}
                {t.note ? ` — ${t.note}` : ""}
              </span>
              <span className="flex items-center gap-3">
                <span className={Number(t.amount) < 0 ? "text-red-600" : "text-green-600"}>{money(Number(t.amount))}</span>
                <form action={deletePayrollTransaction}>
                  <input type="hidden" name="id" value={t.id} />
                  <button className="text-black/40 hover:text-red-600">✕</button>
                </form>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
