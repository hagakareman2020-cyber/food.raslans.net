import type { CapacitorConfig } from "@capacitor/cli";

// غلاف Android/iOS للتطبيق. لأن الموقع SSR (فيه سيرفر + API routes)،
// نحمّل الموقع الحيّ داخل WebView بدل تصدير ثابت — فالمزامنة مع الموقع تلقائية.
const config: CapacitorConfig = {
  appId: "net.raslans.food",
  appName: "مطاعم رسلان",
  webDir: "public",
  server: {
    url: "https://food.raslans.net",
    cleartext: false,
  },
  android: {
    backgroundColor: "#ffffff",
  },
};

export default config;
