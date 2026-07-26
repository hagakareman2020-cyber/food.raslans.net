import Link from "next/link";
import PoweredBy from "@/components/PoweredBy";
import BrandLogo, { BRAND_NAME } from "@/components/BrandLogo";

const features = [
  { icon: "🧾", title: "واجهة طلبات للعملاء", desc: "منيو سهل الاستخدام يفتح بمسح كود QR على الترابيزة." },
  { icon: "👨‍🍳", title: "لوحة إدارة المطبخ والبار", desc: "وصول الطلبات لحظياً وتتبّعها بدون أي تحديث يدوي." },
  { icon: "📊", title: "تحليل الأصناف والمبيعات", desc: "اكتشف أفضل الأصناف وأداء المبيعات عبر أي فترة." },
  { icon: "❤️", title: "تفضيلات العملاء", desc: "افهم ما يحبه عملاؤك من تقييمات الأصناف والطلبات." },
  { icon: "🍔", title: "إدارة القائمة والأسعار", desc: "أقسام ومنتجات وأسعار وصور ومدد تنفيذ بسهولة." },
  { icon: "📈", title: "تقارير مالية شاملة", desc: "تقرير إغلاق وردية (Z-Report) وإحصائيات يومية." },
];

export default function Home() {
  return (
    <main className="flex-1">
      {/* الهيدر */}
      <header className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto w-full">
        <BrandLogo size={38} textClassName="text-xl" subtitle />
        <Link
          href="/login"
          className="rounded-full bg-brand text-white px-5 py-2 text-sm font-semibold hover:bg-brand-dark transition"
        >
          دخول / تسجيل
        </Link>
      </header>

      {/* البطل */}
      <section className="max-w-4xl mx-auto text-center px-6 pt-16 pb-12">
        <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">
          سيستم إدارة المطاعم والكافيهات الذكي
        </h1>
        <p className="mt-6 text-lg text-black/70 dark:text-white/70 max-w-2xl mx-auto">
          نظام متكامل لإدارة المطاعم والكافيهات — من طلبات العملاء وإدارة المطبخ
          والبار، إلى تحليل أفضل الأصناف وأداء المبيعات، مع توليد منيو بالذكاء
          الاصطناعي.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link
            href="/register"
            className="rounded-full bg-brand text-white px-7 py-3 font-semibold hover:bg-brand-dark transition"
          >
            أضف نشاطك مجاناً
          </Link>
          <Link
            href="#features"
            className="rounded-full border border-black/15 dark:border-white/20 px-7 py-3 font-semibold hover:bg-black/5 dark:hover:bg-white/10 transition"
          >
            اعرف المزيد
          </Link>
        </div>
      </section>

      {/* المميزات */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <div
            key={f.title}
            className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5 p-6"
          >
            <div className="text-3xl">{f.icon}</div>
            <h3 className="mt-3 font-bold text-lg">{f.title}</h3>
            <p className="mt-2 text-sm text-black/60 dark:text-white/60">{f.desc}</p>
          </div>
        ))}
      </section>

      <footer className="py-8 space-y-2">
        <p className="text-center text-sm text-black/40 dark:text-white/40">
          © {new Date().getFullYear()} {BRAND_NAME} — كل الحقوق محفوظة
        </p>
        <PoweredBy />
      </footer>
    </main>
  );
}
