"use client";

import { switchBranch } from "@/lib/actions/branch";

type Branch = { id: string; name: string; settings?: { address?: string } | null };

// اسم الفرع + عنوانه (إن وُجد): "مطعم البركة — المهندسين"
function branchLabel(b: Branch) {
  const addr = b.settings?.address?.trim();
  return addr ? `${b.name} — ${addr}` : b.name;
}

// مبدّل الفرع في رأس اللوحة: يظهر للمالك عند امتلاكه أكثر من فرع.
export default function BranchSwitcher({
  branches,
  activeId,
}: {
  branches: Branch[];
  activeId: string;
}) {
  return (
    <form action={switchBranch}>
      <label className="block text-[11px] text-black/40 mb-1">الفرع الحالي</label>
      <select
        name="branch_id"
        defaultValue={activeId}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="w-full rounded-lg border border-black/15 px-2 py-1.5 text-sm font-semibold outline-none focus:border-brand"
      >
        {branches.map((b) => (
          <option key={b.id} value={b.id}>
            {branchLabel(b)}
          </option>
        ))}
      </select>
    </form>
  );
}
