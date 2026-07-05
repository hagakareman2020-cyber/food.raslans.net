// جلب صور الأطباق من Pexels (مجاني) — للسيرفر فقط
import "server-only";

const PEXELS_ENDPOINT = "https://api.pexels.com/v1/search";

// يبحث عن صورة طعام أفقية بحسب كلمة إنجليزية. يعيد null لو لا يوجد مفتاح أو فشل.
export async function fetchFoodImage(query: string): Promise<string | null> {
  const key = process.env.PEXELS_API_KEY;
  if (!key || !query) return null;
  try {
    const url = `${PEXELS_ENDPOINT}?query=${encodeURIComponent(
      query + " food"
    )}&per_page=1&orientation=landscape`;
    const res = await fetch(url, {
      headers: { Authorization: key },
      // تخزين مؤقت ليوم — نفس الكلمة تعيد نفس الصورة
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const photo = data?.photos?.[0];
    return photo?.src?.large || photo?.src?.medium || null;
  } catch {
    return null;
  }
}

// يجلب صوراً لعدة كلمات مع حد للتزامن لتجنّب تجاوز معدل الطلبات
export async function fetchFoodImages(
  queries: string[],
  concurrency = 4
): Promise<(string | null)[]> {
  const results: (string | null)[] = new Array(queries.length).fill(null);
  let i = 0;
  async function worker() {
    while (i < queries.length) {
      const idx = i++;
      results[idx] = await fetchFoodImage(queries[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, queries.length) }, worker));
  return results;
}
