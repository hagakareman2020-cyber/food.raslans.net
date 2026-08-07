# تحويل النظام لتطبيق أندرويد (Android Studio)

النظام يعمل كـ **PWA** (قابل للتثبيت من المتصفح) وكـ **تطبيق أندرويد** عبر Capacitor.
لأن الموقع SSR، التطبيق يفتح الموقع الحيّ `https://restcafe.raslans.net` داخل WebView →
**المزامنة مع الموقع تلقائية** (نفس قاعدة بيانات Supabase).

> ⚠️ مهم: المسار العربي `سيستم جديد تجربة` قد يكسر بناء Gradle. نفّذ خطوات Android
> من نسخة على مسار إنجليزي، مثلاً انسخ مجلد `restaurant-app` إلى `C:\raslan-food-app`
> وشغّل الأوامر هناك.

## 1) تثبيت Capacitor
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
```

## 2) تهيئة المشروع (مرة واحدة)
`capacitor.config.ts` جاهز بالفعل (appId=net.raslans.food، يفتح restcafe.raslans.net).
```bash
npx cap add android
```
يُنشئ مجلد `android/` وهو مشروع Android Studio كامل.

## 3) أيقونة التطبيق
- الأيقونات موجودة في `public/icon-192.png` و `public/icon-512.png`.
- لتوليد أيقونات أندرويد بكل المقاسات تلقائياً:
```bash
npm install -g @capacitor/assets
npx @capacitor/assets generate --android --iconBackgroundColor "#ffffff"
```
(ضع صورة مربعة 1024×1024 باسم `assets/icon.png` قبل التشغيل — استخدم `logo.png`).

## 4) الفتح في Android Studio
```bash
npx cap open android
```
أو افتح مجلد `android/` يدوياً من Android Studio.

## 5) التشغيل والاختبار
- وصّل موبايل (USB debugging مفعّل) أو شغّل Emulator.
- اضغط زر ▶️ Run في Android Studio.

## 6) بناء APK للتجربة
Android Studio → Build → Build Bundle(s)/APK(s) → **Build APK(s)**.
الملف يظهر في `android/app/build/outputs/apk/debug/app-debug.apk`.

## 7) بناء AAB للنشر على Google Play
Android Studio → Build → **Generate Signed Bundle / APK** → Android App Bundle →
أنشئ Keystore (احفظه جيداً!) → Build. الملف `.aab` يُرفع على Play Console.

## ملاحظات
- بعد أي تعديل في `capacitor.config.ts`: `npx cap sync android`.
- إشعارات Push (اختياري لاحقاً): أضف `@capacitor/push-notifications` + Firebase.
- التطبيق يحتاج إنترنت (يفتح الموقع الحيّ). للعمل offline كامل يلزم تصدير ثابت — غير متاح مع SSR.
