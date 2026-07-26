"use client";

import { withBase } from "@/lib/basePath";

// يسجّل إشعارات Native داخل تطبيق Capacitor (أندرويد/iOS) عبر FCM
// يعيد true لو كنا داخل التطبيق الأصلي (فلا نستخدم Web Push)، و false على المتصفح.
export async function registerNativePush(): Promise<boolean> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return false;

    const { PushNotifications } = await import("@capacitor/push-notifications");

    // إرسال الرمز للسيرفر عند نجاح التسجيل
    await PushNotifications.addListener("registration", async (token) => {
      try {
        await fetch(withBase("/api/push/register"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: token.value, platform: "android" }),
        });
      } catch {
        /* تجاهل */
      }
    });
    await PushNotifications.addListener("registrationError", () => {});

    let perm = await PushNotifications.checkPermissions();
    if (perm.receive === "prompt" || perm.receive === "prompt-with-rationale") {
      perm = await PushNotifications.requestPermissions();
    }
    if (perm.receive === "granted") {
      await PushNotifications.register();
    }
    return true; // نحن داخل التطبيق الأصلي — لا نلجأ لـ Web Push
  } catch {
    return false;
  }
}
