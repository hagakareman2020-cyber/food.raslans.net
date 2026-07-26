"use client";

import { useEffect, useRef, useState } from "react";
import { loadFaceModels, getFaceData, getFaceDescriptor, type FaceData } from "@/lib/faceApi";

export type CaptureResult = { blob: Blob | null; descriptor: number[]; data: FaceData | null };

// كاميرا مع كشف الوجه — التقاط تلقائي عند تحقّق الوضع المطلوب (poseCheck) + زر احتياطي
export default function FaceCamera({
  onCapture,
  busy,
  hint,
  poseCheck,
  overlayArrow,
  poseKey,
}: {
  onCapture: (r: CaptureResult) => void;
  busy?: boolean;
  hint?: string;
  poseCheck?: (d: FaceData) => { ok: boolean; message?: string };
  overlayArrow?: "left" | "right" | null;
  poseKey?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [initError, setInitError] = useState("");
  const [captureError, setCaptureError] = useState("");
  const [ready, setReady] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [liveMsg, setLiveMsg] = useState("");
  const [showManual, setShowManual] = useState(false);

  const poseCheckRef = useRef(poseCheck);
  useEffect(() => {
    poseCheckRef.current = poseCheck;
  });
  const stableRef = useRef(0);
  const lastCaptureRef = useRef(0);
  const busyCaptureRef = useRef(false);

  const STABLE_FRAMES = 2;
  const COOLDOWN_MS = 800;
  const FALLBACK_MS = 9000;

  useEffect(() => {
    let cancelled = false;
    async function start() {
      try {
        await loadFaceModels();
        if (cancelled) return;
        setModelsLoading(false);
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setReady(true);
        }
      } catch (e) {
        setInitError("تعذّر تشغيل الكاميرا: " + (e as Error).message + " (يلزم الإذن و HTTPS/localhost)");
      }
    }
    start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // إعادة ضبط العدّاد عند تغيّر الخطوة + زر يدوي احتياطي بعد مهلة
  useEffect(() => {
    stableRef.current = 0;
    setShowManual(false);
    setLiveMsg("");
    const t = setTimeout(() => setShowManual(true), FALLBACK_MS);
    return () => clearTimeout(t);
  }, [poseKey]);

  async function doCapture(data: FaceData | null) {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    busyCaptureRef.current = true;
    try {
      let descriptor = data?.descriptor;
      if (!descriptor) {
        descriptor = (await getFaceDescriptor(video)) ?? undefined;
        if (!descriptor) {
          setCaptureError("لم يتم اكتشاف وجه واضح — تأكد من الإضاءة");
          return;
        }
      }
      setCaptureError("");
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d")?.drawImage(video, 0, 0);
      await new Promise<void>((resolve) => {
        canvas.toBlob(
          (blob) => {
            onCapture({ blob, descriptor: descriptor!, data });
            resolve();
          },
          "image/jpeg",
          0.85
        );
      });
    } finally {
      busyCaptureRef.current = false;
    }
  }

  // حلقة الكشف التلقائي
  useEffect(() => {
    if (!ready) return;
    let stop = false;
    async function tick() {
      if (stop) return;
      const video = videoRef.current;
      if (video && video.videoWidth && !busyCaptureRef.current) {
        try {
          const data = await getFaceData(video);
          if (!data) {
            stableRef.current = 0;
            setLiveMsg("لا يظهر وجه واضح — واجه الكاميرا");
          } else {
            const res = poseCheckRef.current ? poseCheckRef.current(data) : { ok: true };
            setLiveMsg(res.message || "");
            const now = Date.now();
            if (res.ok && now - lastCaptureRef.current > COOLDOWN_MS) {
              stableRef.current += 1;
              if (stableRef.current >= STABLE_FRAMES) {
                stableRef.current = 0;
                lastCaptureRef.current = now;
                await doCapture(data);
              }
            } else if (!res.ok) {
              stableRef.current = 0;
            }
          }
        } catch {
          /* تجاهل إطاراً واحداً */
        }
      }
      if (!stop) setTimeout(tick, 400);
    }
    const id = setTimeout(tick, 500);
    return () => {
      stop = true;
      clearTimeout(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  async function manualCapture() {
    setWorking(true);
    setCaptureError("");
    try {
      const data = await getFaceData(videoRef.current!);
      await doCapture(data);
    } catch (e) {
      setCaptureError((e as Error).message);
    } finally {
      setWorking(false);
    }
  }

  if (initError) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{initError}</div>;
  }

  return (
    <div className="space-y-3">
      {hint && <p className="text-center text-sm font-medium text-black/60">{hint}</p>}
      <div className="relative overflow-hidden rounded-xl border border-black/10 bg-black">
        <video ref={videoRef} autoPlay playsInline muted className="h-72 w-full object-cover" style={{ transform: "scaleX(-1)" }} />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-44 w-36 rounded-[50%] border-2 border-white/40" />
        </div>
        {overlayArrow && (
          <div className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-6xl text-emerald-300 animate-bounce ${overlayArrow === "right" ? "right-3" : "left-3"}`}>
            {overlayArrow === "right" ? "➡️" : "⬅️"}
          </div>
        )}
        {liveMsg && (
          <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/60 px-4 py-1 text-sm text-white">
            {liveMsg}
          </div>
        )}
        {modelsLoading && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 text-sm text-white">
            جارٍ تحميل نموذج الوجه...
          </div>
        )}
      </div>
      {captureError && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">{captureError}</div>
      )}
      {!showManual ? (
        <p className="text-center text-xs text-black/40">سيتم الالتقاط تلقائياً عند اتّباع التعليمات — لا تضغط شيئاً</p>
      ) : (
        <button
          type="button"
          onClick={manualCapture}
          disabled={!ready || modelsLoading || busy || working}
          className="w-full rounded-lg border border-black/15 py-2.5 text-sm font-semibold hover:bg-black/5 disabled:opacity-50"
        >
          📸 التقاط يدوي (احتياطي)
        </button>
      )}
    </div>
  );
}
