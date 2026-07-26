// غلاف face-api للتعرّف على الوجه — يُحمّل ديناميكياً على المتصفح فقط
// (نماذج من CDN مجانية ومستقرة). يُستخدم داخل مكوّنات "use client" فقط.

const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/model";
const DESC_LEN = 128;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let faceapi: any = null;
let loadPromise: Promise<void> | null = null;

export type FaceData = { descriptor: number[]; yaw: number; happy: number };

async function ensureLib() {
  if (!faceapi) faceapi = await import("@vladmandic/face-api");
  return faceapi;
}

// تحميل النماذج مرة واحدة
export async function loadFaceModels(): Promise<void> {
  const f = await ensureLib();
  if (!loadPromise) {
    loadPromise = Promise.all([
      f.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      f.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      f.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      f.nets.faceExpressionNet.loadFromUri(MODEL_URL),
    ]).then(() => undefined);
  }
  return loadPromise;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function estimateYaw(pos: any[]): number {
  const leftEdge = pos[0];
  const rightEdge = pos[16];
  const nose = pos[30];
  const dl = nose.x - leftEdge.x;
  const dr = rightEdge.x - nose.x;
  const total = dl + dr;
  if (total <= 0) return 0;
  return (dl - dr) / total;
}

// قراءة شاملة للوجه: البصمة + التعبير + زاوية الرأس
export async function getFaceData(input: HTMLVideoElement): Promise<FaceData | null> {
  const f = await ensureLib();
  await loadFaceModels();
  const opts = new f.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });
  const res = await f
    .detectSingleFace(input, opts)
    .withFaceLandmarks()
    .withFaceExpressions()
    .withFaceDescriptor();
  if (!res) return null;
  return {
    descriptor: Array.from(res.descriptor) as number[],
    yaw: estimateYaw(res.landmarks.positions),
    happy: res.expressions?.happy ?? 0,
  };
}

export async function getFaceDescriptor(input: HTMLVideoElement): Promise<number[] | null> {
  const d = await getFaceData(input);
  return d ? d.descriptor : null;
}

// توحيد البصمات المخزّنة — يقبل فقط بصمات 128 رقم
export function normalizeStored(stored: unknown): number[][] {
  if (!Array.isArray(stored) || stored.length === 0) return [];
  const arr = Array.isArray(stored[0])
    ? (stored as number[][])
    : typeof stored[0] === "number"
      ? [stored as number[]]
      : [];
  return arr.filter((d) => Array.isArray(d) && d.length === DESC_LEN);
}
