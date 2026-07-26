/* Service Worker لاستقبال إشعارات FCM في الخلفية (التطبيق مغلق) */
importScripts("https://www.gstatic.com/firebasejs/12.16.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.16.0/firebase-messaging-compat.js");

// إعدادات عامة (مفاتيح ويب عامة — ليست سرّية)
firebase.initializeApp({
  apiKey: "AIzaSyAUYrQWXfp4YRWssxQ4758R_-ETUAfS3KU",
  authDomain: "raslan-food.firebaseapp.com",
  projectId: "raslan-food",
  storageBucket: "raslan-food.firebasestorage.app",
  messagingSenderId: "150981055817",
  appId: "1:150981055817:web:1750848de44f0e11683698",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || "منيو الذكي";
  const options = {
    body: payload.notification?.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: (payload.fcmOptions && payload.fcmOptions.link) || "/dashboard/attendance" },
  };
  self.registration.showNotification(title, options);
});

// فتح اللوحة عند الضغط على الإشعار
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/dashboard/attendance";
  event.waitUntil(clients.openWindow(url));
});
