// منطق الحضور: المسافة الجغرافية + حساب التأخير والأوفرتايم
// منقول ومبسّط من نظام رسلان للحضور والانصراف

export type Shift = {
  start_time: string | null; // "HH:MM" أو "HH:MM:SS"
  end_time: string | null;
  grace_minutes: number | null;
};

export type Geofence = { lat: number; lng: number; radius_m: number; enabled: boolean };

// المسافة بين نقطتين بالمتر (Haversine)
export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // نصف قطر الأرض بالمتر
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function parseHM(t: string): [number, number] {
  const [h, m] = t.split(":").map(Number);
  return [h || 0, m || 0];
}

// دقائق التأخير بناءً على وقت الحضور ووقت بدء الشيفت + فترة السماح
export function computeLateMinutes(checkIn: Date, shift: Shift | null): number {
  if (!shift?.start_time) return 0;
  const [h, m] = parseHM(shift.start_time);
  const start = new Date(checkIn);
  start.setHours(h, m, 0, 0);
  const grace = shift.grace_minutes || 0;
  const allowed = new Date(start.getTime() + grace * 60000);
  const diff = checkIn.getTime() - allowed.getTime();
  return diff > 0 ? Math.round(diff / 60000) : 0;
}

// ---- مطابقة بصمة الوجه (تُنفَّذ على السيرفر بحساب المسافة فقط — بلا نماذج) ----
const DESC_LEN = 128;
const FACE_THRESHOLD = 0.6; // أقل = أكثر تشابهاً

function euclidean(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum);
}

// يقبل بصمة واحدة [128] أو عدة بصمات [[128],...]
function normalizeDescriptors(stored: unknown): number[][] {
  if (!Array.isArray(stored) || stored.length === 0) return [];
  const arr = Array.isArray(stored[0])
    ? (stored as number[][])
    : typeof stored[0] === "number"
      ? [stored as number[]]
      : [];
  return arr.filter((d) => Array.isArray(d) && d.length === DESC_LEN);
}

// يطابق البصمة الحيّة مع المخزّنة — يرجع أقرب مطابقة
export function matchFace(
  stored: unknown,
  live: number[] | null | undefined
): { match: boolean | null; score: number | null } {
  const list = normalizeDescriptors(stored);
  if (!list.length || !Array.isArray(live) || live.length !== DESC_LEN) {
    return { match: null, score: null };
  }
  let best = Infinity;
  for (const d of list) {
    const dist = euclidean(d, live);
    if (dist < best) best = dist;
  }
  const score = Math.max(0, Math.min(100, Math.round((1 - best) * 100)));
  return { match: best <= FACE_THRESHOLD, score };
}

export function hasFaceEnrolled(stored: unknown): boolean {
  return normalizeDescriptors(stored).length > 0;
}

// دقائق الأوفرتايم بناءً على وقت الانصراف ووقت نهاية الشيفت
export function computeOvertimeMinutes(checkOut: Date, shift: Shift | null): number {
  if (!shift?.end_time) return 0;
  const [h, m] = parseHM(shift.end_time);
  const end = new Date(checkOut);
  end.setHours(h, m, 0, 0);
  const diff = checkOut.getTime() - end.getTime();
  return diff > 0 ? Math.round(diff / 60000) : 0;
}
