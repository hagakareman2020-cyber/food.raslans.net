"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { checkIn, checkOut } from "@/lib/actions/attendance";

function fmtTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
}

// أداة تسجيل الحضور/الانصراف للموظف الحالي
export default function AttendanceWidget({
  checkInAt,
  checkOutAt,
}: {
  checkInAt: string | null;
  checkOutAt: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const notInYet = !checkInAt;
  const inNotOut = checkInAt && !checkOutAt;
  const doneToday = checkInAt && checkOutAt;

  function run(fn: () => Promise<{ error?: string; ok?: boolean } | null>) {
    setError(null);
    start(async () => {
      const r = await fn();
      if (r?.error) setError(r.error);
      else router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-6">
      <h2 className="font-bold mb-1">🕒 حضوري اليوم</h2>
      <div className="flex gap-6 text-sm text-black/60 mb-4">
        <span>الحضور: <b className="text-black/80">{fmtTime(checkInAt)}</b></span>
        <span>الانصراف: <b className="text-black/80">{fmtTime(checkOutAt)}</b></span>
      </div>

      {doneToday ? (
        <p className="rounded-lg bg-green-50 text-green-700 text-sm px-3 py-2 font-semibold">
          ✅ تم تسجيل حضورك وانصرافك اليوم. شكراً لك!
        </p>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={() => run(checkIn)}
            disabled={pending || !notInYet}
            className="flex-1 rounded-xl bg-green-600 text-white py-3 font-bold hover:bg-green-700 disabled:opacity-40"
          >
            تسجيل حضور
          </button>
          <button
            onClick={() => run(checkOut)}
            disabled={pending || !inNotOut}
            className="flex-1 rounded-xl bg-brand text-white py-3 font-bold hover:bg-brand-dark disabled:opacity-40"
          >
            تسجيل انصراف
          </button>
        </div>
      )}
      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
    </div>
  );
}
