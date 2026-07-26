"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { checkIn, checkOut, saveFaceDescriptor, type CheckInInput } from "@/lib/actions/attendance";
import { withBase } from "@/lib/basePath";
import { getDeviceId } from "@/lib/device";
import FaceEnroll from "@/components/FaceEnroll";
import FaceCamera, { type CaptureResult } from "@/components/FaceCamera";
import type { FaceData } from "@/lib/faceApi";

function fmtTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
}

function getPosition(): Promise<GeolocationCoordinates | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos.coords),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
  });
}

async function uploadBlob(blob: Blob | null): Promise<string | null> {
  if (!blob) return null;
  try {
    const fd = new FormData();
    fd.append("file", new File([blob], "selfie.jpg", { type: "image/jpeg" }));
    fd.append("folder", "attendance-selfies");
    const res = await fetch(withBase("/api/upload"), { method: "POST", body: fd });
    const data = await res.json();
    return res.ok ? data.url : null;
  } catch {
    return null;
  }
}

async function captureSelfie(): Promise<string | null> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
    const video = document.createElement("video");
    video.srcObject = stream;
    video.muted = true;
    await video.play();
    await new Promise((r) => setTimeout(r, 500));
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 480;
    canvas.height = video.videoHeight || 640;
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    stream.getTracks().forEach((t) => t.stop());
    const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.7));
    return uploadBlob(blob);
  } catch {
    return null;
  }
}

const frontPose = (d: FaceData) =>
  Math.abs(d.yaw) < 0.25 ? { ok: true, message: "ثبات لحظة..." } : { ok: false, message: "واجه الكاميرا مباشرة" };

export default function AttendanceWidget({
  checkInAt,
  checkOutAt,
  geofenceEnabled = false,
  selfieEnabled = false,
  faceRequired = false,
  faceEnrolled = false,
}: {
  checkInAt: string | null;
  checkOutAt: string | null;
  geofenceEnabled?: boolean;
  selfieEnabled?: boolean;
  faceRequired?: boolean;
  faceEnrolled?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "enroll" | "capture">("idle");
  const [enrolled, setEnrolled] = useState(faceEnrolled);

  const notInYet = !checkInAt;
  const inNotOut = checkInAt && !checkOutAt;
  const doneToday = checkInAt && checkOutAt;

  // إتمام التسجيل بعد الحصول على بصمة الوجه (إن لزمت)
  async function finishCheckIn(faceDescriptor: number[] | null) {
    setError(null);
    setBusy("جارٍ تحديد الموقع...");
    const coords = await getPosition();
    if (geofenceEnabled && !coords) {
      setBusy(null);
      setError("لتسجيل الحضور يجب السماح بالوصول للموقع.");
      return;
    }
    let selfieUrl: string | null = null;
    if (selfieEnabled && !faceDescriptor) {
      setBusy("جارٍ التقاط الصورة...");
      selfieUrl = await captureSelfie();
    }
    setBusy("جارٍ التسجيل...");
    const input: CheckInInput = {
      lat: coords?.latitude ?? null,
      lng: coords?.longitude ?? null,
      accuracy: coords?.accuracy ?? null,
      selfieUrl,
      faceDescriptor: faceDescriptor ?? null,
      deviceId: getDeviceId(),
    };
    const r = await checkIn(input);
    setBusy(null);
    setPhase("idle");
    if (r?.error) setError(r.error);
    else router.refresh();
  }

  function startCheckIn() {
    setError(null);
    if (faceRequired && enrolled) setPhase("capture");
    else finishCheckIn(null);
  }

  // التقاط وجه واحد للتحقق ثم إتمام التسجيل
  function onFaceCapture(r: CaptureResult) {
    setPhase("idle");
    finishCheckIn(r.descriptor);
  }

  async function onEnrollComplete(descriptors: number[][]) {
    setBusy("جارٍ حفظ البصمة...");
    const r = await saveFaceDescriptor(descriptors);
    setBusy(null);
    if (r?.error) {
      setError(r.error);
      setPhase("idle");
    } else {
      setEnrolled(true);
      setPhase("idle");
    }
  }

  async function doCheckOut() {
    setError(null);
    setBusy("جارٍ التسجيل...");
    const coords = await getPosition();
    const r = await checkOut({ lat: coords?.latitude ?? null, lng: coords?.longitude ?? null });
    setBusy(null);
    if (r?.error) setError(r.error);
    else router.refresh();
  }

  const pending = !!busy;

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-6">
      <h2 className="font-bold mb-1">🕒 حضوري اليوم</h2>
      <div className="flex gap-6 text-sm text-black/60 mb-4">
        <span>الحضور: <b className="text-black/80">{fmtTime(checkInAt)}</b></span>
        <span>الانصراف: <b className="text-black/80">{fmtTime(checkOutAt)}</b></span>
      </div>

      {(geofenceEnabled || selfieEnabled || faceRequired) && !doneToday && phase === "idle" && (
        <p className="text-xs text-black/45 mb-3">
          {faceRequired && "🙂 تحقّق ببصمة الوجه. "}
          {geofenceEnabled && "📍 داخل نطاق الفرع. "}
          {selfieEnabled && !faceRequired && "📸 صورة تحقّق."}
        </p>
      )}

      {phase === "enroll" ? (
        <FaceEnroll onComplete={onEnrollComplete} onCancel={() => setPhase("idle")} saving={pending} />
      ) : phase === "capture" ? (
        <div className="space-y-2">
          <FaceCamera poseKey="checkin" poseCheck={frontPose} onCapture={onFaceCapture} hint="انظر للكاميرا لتسجيل حضورك" />
          <button onClick={() => setPhase("idle")} className="w-full rounded-lg border border-black/15 py-2 text-sm hover:bg-black/5">
            إلغاء
          </button>
        </div>
      ) : doneToday ? (
        <p className="rounded-lg bg-green-50 text-green-700 text-sm px-3 py-2 font-semibold">
          ✅ تم تسجيل حضورك وانصرافك اليوم. شكراً لك!
        </p>
      ) : faceRequired && !enrolled ? (
        <div className="space-y-2">
          <p className="text-sm text-black/55">لتأكيد هويتك، سجّل بصمة وجهك مرة واحدة قبل تسجيل الحضور.</p>
          <button
            onClick={() => setPhase("enroll")}
            className="w-full rounded-xl bg-brand text-white py-3 font-bold hover:bg-brand-dark"
          >
            تسجيل بصمة الوجه
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={startCheckIn}
            disabled={pending || !notInYet}
            className="flex-1 rounded-xl bg-green-600 text-white py-3 font-bold hover:bg-green-700 disabled:opacity-40"
          >
            تسجيل حضور
          </button>
          <button
            onClick={doCheckOut}
            disabled={pending || !inNotOut}
            className="flex-1 rounded-xl bg-brand text-white py-3 font-bold hover:bg-brand-dark disabled:opacity-40"
          >
            تسجيل انصراف
          </button>
        </div>
      )}
      {busy && <p className="text-sm text-black/50 mt-3">{busy}</p>}
      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
    </div>
  );
}
