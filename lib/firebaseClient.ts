"use client";

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

export const firebaseConfigured = !!(config.apiKey && config.projectId && VAPID_KEY);

function getFirebaseApp(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(config);
}

// يطلب الإذن ويُرجع رمز جهاز FCM (أو null لو غير مدعوم/مرفوض)
export async function registerForPush(): Promise<string | null> {
  try {
    if (!firebaseConfigured) return null;
    if (!(await isSupported().catch(() => false))) return null;
    if (typeof Notification === "undefined") return null;
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;

    const reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    const messaging = getMessaging(getFirebaseApp());
    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: reg });
    return token || null;
  } catch {
    return null;
  }
}

// استقبال الرسائل والتطبيق مفتوح (foreground)
export async function listenForeground(cb: (title: string, body: string) => void) {
  if (!firebaseConfigured || !(await isSupported().catch(() => false))) return;
  const messaging = getMessaging(getFirebaseApp());
  onMessage(messaging, (payload) => {
    const n = payload.notification;
    if (n?.title) cb(n.title, n.body || "");
  });
}
