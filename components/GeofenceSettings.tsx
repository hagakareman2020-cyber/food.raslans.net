"use client";

import { useState } from "react";
import { updateGeofence } from "@/lib/actions/restaurant";

type Geo = { lat: number; lng: number; radius_m: number; enabled: boolean } | null;

// ضبط النطاق الجغرافي للفرع: التقاط الموقع + نصف القطر + التفعيل + صورة التحقّق
export default function GeofenceSettings({
  current,
  selfie,
  face,
}: {
  current: Geo;
  selfie: boolean;
  face: boolean;
}) {
  const [lat, setLat] = useState<number | null>(current?.lat ?? null);
  const [lng, setLng] = useState<number | null>(current?.lng ?? null);
  const [locating, setLocating] = useState(false);
  const [locErr, setLocErr] = useState<string | null>(null);

  function capture() {
    setLocErr(null);
    if (!navigator.geolocation) {
      setLocErr("المتصفح لا يدعم تحديد الموقع");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setLocating(false);
      },
      (e) => {
        setLocErr("تعذّر تحديد الموقع: " + e.message);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  const hasLoc = lat != null && lng != null;

  return (
    <form action={updateGeofence} className="rounded-2xl border border-black/10 bg-white p-6 space-y-4 mb-6">
      <h2 className="font-bold">📍 نطاق تسجيل الحضور (Geofence)</h2>
      <p className="text-sm text-black/55">
        حدّد موقع الفرع ونصف قطر مسموح؛ عندها لن يستطيع الموظف تسجيل الحضور إلا وهو داخل هذا النطاق.
        قف داخل الفرع واضغط «التقاط موقع الفرع».
      </p>

      <input type="hidden" name="lat" value={lat ?? ""} />
      <input type="hidden" name="lng" value={lng ?? ""} />

      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={capture}
          className="rounded-lg border border-brand text-brand px-4 py-2 text-sm font-semibold hover:bg-brand/5"
        >
          {locating ? "جارٍ التحديد..." : "📌 التقاط موقع الفرع"}
        </button>
        {hasLoc && (
          <span className="text-xs text-black/50" dir="ltr">
            {lat!.toFixed(5)}, {lng!.toFixed(5)}
          </span>
        )}
      </div>
      {locErr && <p className="text-sm text-red-600">{locErr}</p>}

      <div>
        <label className="block text-sm mb-1">نصف القطر المسموح (متر)</label>
        <input
          type="number"
          name="radius_m"
          min={20}
          max={2000}
          step={10}
          defaultValue={current?.radius_m ?? 100}
          className="w-full rounded-lg border border-black/15 px-3 py-2 outline-none focus:border-brand"
        />
      </div>

      <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
        <input
          type="checkbox"
          name="enabled"
          value="1"
          defaultChecked={current?.enabled ?? false}
          className="accent-brand w-4 h-4"
        />
        تفعيل التقييد بالموقع لهذا الفرع
      </label>

      <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
        <input
          type="checkbox"
          name="selfie"
          value="1"
          defaultChecked={selfie}
          className="accent-brand w-4 h-4"
        />
        📸 طلب صورة تحقّق عند تسجيل الحضور
      </label>

      <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
        <input
          type="checkbox"
          name="face"
          value="1"
          defaultChecked={face}
          className="accent-brand w-4 h-4"
        />
        🙂 التحقق ببصمة الوجه (يسجّل الموظف وجهه مرة ثم يُطابَق عند الحضور)
      </label>

      <button className="rounded-lg bg-brand text-white px-6 py-2.5 font-semibold hover:bg-brand-dark">
        حفظ الإعدادات
      </button>
    </form>
  );
}
