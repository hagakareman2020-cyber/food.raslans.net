// مساعد لإضافة المسار الأساسي إلى نداءات الـ API والروابط الداخلية (يدوياً)
// لأن fetch و <a href> لا يطبّقان basePath تلقائياً (بخلاف Link و router).
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

export function withBase(path: string): string {
  return `${BASE_PATH}${path}`;
}
