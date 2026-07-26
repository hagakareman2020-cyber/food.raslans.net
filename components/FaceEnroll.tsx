"use client";

import { useEffect, useRef, useState } from "react";
import FaceCamera, { type CaptureResult } from "@/components/FaceCamera";
import type { FaceData } from "@/lib/faceApi";

// أوضاع التسجيل: أمامي ← يمين ← يسار، لقطتان لكل وضع
const STEPS: {
  key: string;
  label: string;
  icon: string;
  arrow: "left" | "right" | null;
  captures: number;
  check: (d: FaceData) => { ok: boolean; message?: string };
}[] = [
  {
    key: "front",
    label: "انظر للأمام مباشرة",
    icon: "🙂",
    arrow: null,
    captures: 2,
    check: (d) => (Math.abs(d.yaw) < 0.13 ? { ok: true, message: "ثابت... جارٍ الالتقاط" } : { ok: false, message: "اعتدل وواجه الكاميرا" }),
  },
  {
    key: "right",
    label: "أدِر رأسك ناحية اليمين",
    icon: "➡️",
    arrow: "right",
    captures: 2,
    check: (d) => (d.yaw < -0.16 ? { ok: true, message: "ممتاز — ثابت" } : { ok: false, message: "أدِر رأسك أكثر ➡️" }),
  },
  {
    key: "left",
    label: "أدِر رأسك ناحية اليسار",
    icon: "⬅️",
    arrow: "left",
    captures: 2,
    check: (d) => (d.yaw > 0.16 ? { ok: true, message: "ممتاز — ثابت" } : { ok: false, message: "أدِر رأسك أكثر ⬅️" }),
  },
];

const TOTAL = STEPS.reduce((a, s) => a + s.captures, 0);

export default function FaceEnroll({
  onComplete,
  onCancel,
  saving,
}: {
  onComplete: (descriptors: number[][]) => void;
  onCancel?: () => void;
  saving?: boolean;
}) {
  const [descriptors, setDescriptors] = useState<number[][]>([]);
  const [stepIdx, setStepIdx] = useState(0);
  const [done, setDone] = useState(false);

  const stepIdxRef = useRef(0);
  const stepCountRef = useRef(0);
  const savedRef = useRef(false);

  const step = STEPS[stepIdx];
  const pct = Math.round((descriptors.length / TOTAL) * 100);

  function goNext() {
    const ni = stepIdxRef.current + 1;
    stepCountRef.current = 0;
    if (ni >= STEPS.length) setDone(true);
    else {
      stepIdxRef.current = ni;
      setStepIdx(ni);
    }
  }

  function handleCapture(r: CaptureResult) {
    if (done) return;
    setDescriptors((d) => [...d, r.descriptor]);
    const nc = stepCountRef.current + 1;
    if (nc >= STEPS[stepIdxRef.current].captures) goNext();
    else stepCountRef.current = nc;
  }

  useEffect(() => {
    if (done && !savedRef.current) {
      savedRef.current = true;
      onComplete(descriptors);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  if (done) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-6 text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-green-500 text-2xl text-white">✓</div>
        <div className="font-medium text-green-700">{saving ? "جارٍ حفظ البصمة..." : "تم حفظ بصمة وجهك بنجاح"}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="font-semibold text-black/80">تسجيل بصمة الوجه</div>
        <div className="mt-1 text-sm text-black/50">اتبع التعليمات — الالتقاط تلقائي</div>
      </div>
      <div className="rounded-xl border border-brand/20 bg-brand/5 px-3 py-2 text-center text-sm font-medium text-brand">
        {step.icon} {step.label}
      </div>
      <FaceCamera poseKey={step.key} poseCheck={step.check} overlayArrow={step.arrow} onCapture={handleCapture} />
      <div>
        <div className="mb-1 flex items-center justify-between text-xs text-black/50">
          <span>الوضع {stepIdx + 1}/{STEPS.length}</span>
          <span dir="ltr">{descriptors.length} / {TOTAL}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-black/10">
          <div className="h-full rounded-full bg-brand transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>
      </div>
      {onCancel && (
        <div className="flex justify-center">
          <button type="button" onClick={onCancel} className="rounded-lg border border-black/15 px-5 py-2 text-sm hover:bg-black/5">
            إلغاء
          </button>
        </div>
      )}
    </div>
  );
}
