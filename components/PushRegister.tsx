"use client";

import { useEffect } from "react";
import { registerForPush, listenForeground } from "@/lib/firebaseClient";
import { registerNativePush } from "@/lib/nativePush";
import { withBase } from "@/lib/basePath";

// يسجّل رمز جهاز الإشعارات مرة عند تحميل اللوحة (للمالك أساساً لاستقبال تنبيهات التأخير)
export default function PushRegister() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // داخل تطبيق أندرويد → إشعارات Native (تصل والتطبيق مقفول). غير كده → Web Push
      const isNative = await registerNativePush();
      if (isNative) return;

      const token = await registerForPush();
      if (cancelled || !token) return;
      // لا نُعيد الإرسال لنفس الرمز في نفس الجلسة
      if (sessionStorage.getItem("push_token_sent") === token) return;
      try {
        const res = await fetch(withBase("/api/push/register"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        if (res.ok) sessionStorage.setItem("push_token_sent", token);
      } catch {
        /* تجاهل */
      }
    })();

    // إشعار داخل الصفحة عند وصول رسالة والتطبيق مفتوح
    listenForeground((title, body) => {
      try {
        new Notification(title, { body, icon: withBase("/icon-192.png") });
      } catch {
        /* المتصفح قد يمنع — تجاهل */
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
