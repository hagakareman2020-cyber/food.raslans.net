"use client";

import { useEffect } from "react";

// يسجّل الـ Service Worker لتفعيل تثبيت التطبيق (PWA).
export default function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
