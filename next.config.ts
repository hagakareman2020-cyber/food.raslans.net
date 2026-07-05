import type { NextConfig } from "next";

// المسار الأساسي عند الاستضافة تحت مسار فرعي (مثل /Food-system على raslans.net)
// يُضبط عبر متغير البيئة NEXT_PUBLIC_BASE_PATH؛ فارغ محلياً.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  ...(basePath ? { basePath } : {}),
};

export default nextConfig;
