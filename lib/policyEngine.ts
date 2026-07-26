// محرّك تطبيق السياسات — تُطبَّق قاعدة واحدة فقط (أعلى شريحة مطابقة)، لا تراكم.

export type PolicyRule = {
  from_value: number | string;
  to_value: number | string | null;
  action: string;
  amount: number | string | null;
};

// يختار القاعدة الوحيدة المطبَّقة على قيمة (دقائق تأخير / ساعات أوفرتايم)
export function selectPolicyRule(rules: PolicyRule[], value: number | null): PolicyRule | null {
  if (!rules?.length || value == null) return null;
  const matches = rules.filter((r) => {
    const from = Number(r.from_value);
    const to = r.to_value == null || r.to_value === "" ? null : Number(r.to_value);
    return value >= from && (to == null || value <= to);
  });
  if (!matches.length) return null;
  return matches.reduce((best, r) => (Number(r.from_value) > Number(best.from_value) ? r : best), matches[0]);
}

// يحوّل إجراء القاعدة لأثر مالي (سالب خصم، موجب مكافأة)
export function resolvePolicyEffect(
  rule: PolicyRule | null,
  { dailyRate = 0, hoursPerDay = 8 }: { dailyRate?: number; hoursPerDay?: number } = {}
): { amount: number; label: string } {
  if (!rule) return { amount: 0, label: "لا يوجد" };
  const amt = Number(rule.amount) || 0;
  const hourRate = hoursPerDay ? dailyRate / hoursPerDay : 0;
  const map: Record<string, { amount: number; label: string }> = {
    alert: { amount: 0, label: "تنبيه فقط" },
    deduct_days: { amount: -(dailyRate * amt), label: `خصم ${amt} يوم` },
    bonus_days: { amount: dailyRate * amt, label: `مكافأة ${amt} يوم` },
    deduct_fixed: { amount: -amt, label: `خصم ${amt}` },
    deduct_percent: { amount: -((dailyRate * amt) / 100), label: `خصم ${amt}%` },
    deduct_hours: { amount: -(hourRate * amt), label: `خصم ${amt} ساعة` },
    deduct_quarter_day: { amount: -(dailyRate * 0.25), label: "خصم ربع يوم" },
    deduct_half_day: { amount: -(dailyRate * 0.5), label: "خصم نصف يوم" },
    deduct_full_day: { amount: -dailyRate, label: "خصم يوم كامل" },
    bonus_fixed: { amount: amt, label: `مكافأة ${amt}` },
    bonus_hours: { amount: hourRate * amt, label: `مكافأة ${amt} ساعة` },
    bonus_quarter_day: { amount: dailyRate * 0.25, label: "مكافأة ربع يوم" },
    bonus_half_day: { amount: dailyRate * 0.5, label: "مكافأة نصف يوم" },
    bonus_full_day: { amount: dailyRate, label: "مكافأة يوم كامل" },
  };
  return map[rule.action] || { amount: 0, label: rule.action };
}

// قائمة الإجراءات المتاحة للواجهة
export const POLICY_ACTIONS: { value: string; label: string; kinds: ("late" | "overtime")[] }[] = [
  { value: "alert", label: "تنبيه فقط", kinds: ["late", "overtime"] },
  { value: "deduct_fixed", label: "خصم مبلغ ثابت", kinds: ["late"] },
  { value: "deduct_percent", label: "خصم نسبة % من اليوم", kinds: ["late"] },
  { value: "deduct_hours", label: "خصم ساعات", kinds: ["late"] },
  { value: "deduct_quarter_day", label: "خصم ربع يوم", kinds: ["late"] },
  { value: "deduct_half_day", label: "خصم نصف يوم", kinds: ["late"] },
  { value: "deduct_full_day", label: "خصم يوم كامل", kinds: ["late"] },
  { value: "bonus_fixed", label: "مكافأة مبلغ ثابت", kinds: ["overtime"] },
  { value: "bonus_hours", label: "مكافأة ساعات", kinds: ["overtime"] },
  { value: "bonus_quarter_day", label: "مكافأة ربع يوم", kinds: ["overtime"] },
  { value: "bonus_half_day", label: "مكافأة نصف يوم", kinds: ["overtime"] },
  { value: "bonus_full_day", label: "مكافأة يوم كامل", kinds: ["overtime"] },
];
