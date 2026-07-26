import { requireOwner } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { POLICY_ACTIONS } from "@/lib/policyEngine";
import {
  createPolicy,
  deletePolicy,
  setDefaultPolicy,
  addPolicyRule,
  deletePolicyRule,
} from "@/lib/actions/policies";

type Rule = { id: string; from_value: number; to_value: number | null; action: string; amount: number | null };
type Policy = { id: string; name: string; kind: "late" | "overtime"; is_default: boolean; policy_rules: Rule[] };

const ACTION_LABEL = new Map(POLICY_ACTIONS.map((a) => [a.value, a.label]));

export default async function PoliciesPage() {
  const restaurant = await requireOwner();
  const supabase = await createClient();
  const { data } = await supabase
    .from("policies")
    .select("id, name, kind, is_default, policy_rules(id, from_value, to_value, action, amount)")
    .eq("restaurant_id", restaurant.id)
    .order("created_at");
  const policies = (data as Policy[]) ?? [];

  function PolicyCard({ p }: { p: Policy }) {
    const actions = POLICY_ACTIONS.filter((a) => a.kinds.includes(p.kind));
    const unit = p.kind === "late" ? "دقيقة" : "ساعة";
    return (
      <div className="rounded-2xl border border-black/10 bg-white p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold">
            {p.name}{" "}
            {p.is_default && <span className="text-xs bg-brand/10 text-brand rounded px-2 py-0.5">افتراضي</span>}
          </h3>
          <div className="flex items-center gap-2">
            {!p.is_default && (
              <form action={setDefaultPolicy}>
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="kind" value={p.kind} />
                <button className="text-xs text-brand hover:underline">تعيين كافتراضي</button>
              </form>
            )}
            <form action={deletePolicy}>
              <input type="hidden" name="id" value={p.id} />
              <button className="text-xs text-red-600 hover:underline">حذف</button>
            </form>
          </div>
        </div>

        {p.policy_rules.length > 0 ? (
          <ul className="space-y-1 text-sm mb-3">
            {p.policy_rules
              .slice()
              .sort((a, b) => a.from_value - b.from_value)
              .map((r) => (
                <li key={r.id} className="flex items-center justify-between border-b border-black/5 pb-1">
                  <span>
                    من <b>{r.from_value}</b> {r.to_value != null ? `إلى ${r.to_value}` : "فأكثر"} {unit} →{" "}
                    <span className="text-black/70">
                      {ACTION_LABEL.get(r.action) ?? r.action}
                      {r.amount != null ? ` (${r.amount})` : ""}
                    </span>
                  </span>
                  <form action={deletePolicyRule}>
                    <input type="hidden" name="id" value={r.id} />
                    <button className="text-red-600 text-xs hover:underline">✕</button>
                  </form>
                </li>
              ))}
          </ul>
        ) : (
          <p className="text-sm text-black/40 mb-3">لا توجد شرائح بعد.</p>
        )}

        <form action={addPolicyRule} className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
          <input type="hidden" name="policy_id" value={p.id} />
          <label className="text-xs text-black/50">من ({unit})
            <input type="number" name="from_value" defaultValue={0} min={0} className="mt-1 w-full rounded-lg border border-black/15 px-2 py-1.5 text-sm" />
          </label>
          <label className="text-xs text-black/50">إلى (اختياري)
            <input type="number" name="to_value" min={0} className="mt-1 w-full rounded-lg border border-black/15 px-2 py-1.5 text-sm" />
          </label>
          <label className="text-xs text-black/50">الإجراء
            <select name="action" className="mt-1 w-full rounded-lg border border-black/15 px-2 py-1.5 text-sm">
              {actions.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-black/50">القيمة
            <input type="number" name="amount" step="0.1" className="mt-1 w-full rounded-lg border border-black/15 px-2 py-1.5 text-sm" />
          </label>
          <button className="rounded-lg bg-brand text-white px-3 py-2 text-sm font-semibold hover:bg-brand-dark">+ شريحة</button>
        </form>
      </div>
    );
  }

  const late = policies.filter((p) => p.kind === "late");
  const overtime = policies.filter((p) => p.kind === "overtime");

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-1">سياسات التأخير والأوفرتايم</h1>
      <p className="text-black/60 mb-6">
        عرّف شرائح (من–إلى) لكل سياسة وإجراءها (خصم/مكافأة). تُطبَّق شريحة واحدة فقط (الأعلى المطابقة)، وتُحسب في الرواتب.
      </p>

      <form action={createPolicy} className="rounded-2xl border border-black/10 bg-white p-5 mb-6 flex flex-wrap items-end gap-3">
        <label className="text-sm">اسم السياسة
          <input name="name" required placeholder="مثال: خصم تأخير قياسي" className="mt-1 block w-56 rounded-lg border border-black/15 px-3 py-2 text-sm outline-none focus:border-brand" />
        </label>
        <label className="text-sm">النوع
          <select name="kind" className="mt-1 block rounded-lg border border-black/15 px-3 py-2 text-sm">
            <option value="late">تأخير</option>
            <option value="overtime">أوفرتايم</option>
          </select>
        </label>
        <button className="rounded-lg bg-brand text-white px-5 py-2 text-sm font-semibold hover:bg-brand-dark">إنشاء سياسة</button>
      </form>

      <div className="space-y-6">
        <section>
          <h2 className="font-bold mb-3">⏰ سياسات التأخير</h2>
          {late.length ? <div className="space-y-4">{late.map((p) => <PolicyCard key={p.id} p={p} />)}</div> : <p className="text-black/40 text-sm">لا توجد سياسات تأخير.</p>}
        </section>
        <section>
          <h2 className="font-bold mb-3">➕ سياسات الأوفرتايم</h2>
          {overtime.length ? <div className="space-y-4">{overtime.map((p) => <PolicyCard key={p.id} p={p} />)}</div> : <p className="text-black/40 text-sm">لا توجد سياسات أوفرتايم.</p>}
        </section>
      </div>
    </div>
  );
}
