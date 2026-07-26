import Link from "next/link";
import { getAccess, SECTIONS, type SectionKey } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import OnboardingForm from "@/components/OnboardingForm";
import { businessLabels } from "@/lib/businessType";

const SECTION_HREF: Record<SectionKey, string> = {
  menu: "/dashboard/menu",
  pos: "/dashboard/pos",
  kitchen: "/dashboard/kitchen",
  tables: "/dashboard/tables",
  analytics: "/dashboard/analytics",
  inventory: "/dashboard/inventory",
};

export default async function DashboardHome() {
  const access = await getAccess();

  // مالك جديد بلا مطعم → إنشاء المطعم
  if (!access) {
    return (
      <div className="max-w-lg mx-auto mt-6">
        <h1 className="text-2xl font-bold">أضف نشاطك</h1>
        <p className="text-black/60 mt-1">ابدأ بإدخال بيانات نشاطك الأساسية.</p>
        <OnboardingForm />
      </div>
    );
  }

  const { restaurant, isOwner, sections } = access;
  const labels = businessLabels(restaurant.settings);

  // موظف → ترحيب + روابط أقسامه
  if (!isOwner) {
    return (
      <div>
        <h1 className="text-2xl font-bold">مرحباً 👋</h1>
        <p className="text-black/60 mt-1">أنت موظف في {restaurant.name}. هذه أقسامك:</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-6">
          {[...sections].map((s) => (
            <Link
              key={s}
              href={SECTION_HREF[s as SectionKey] ?? "/dashboard"}
              className="rounded-2xl border border-black/10 p-5 bg-white hover:border-brand transition font-bold"
            >
              {SECTIONS[s as SectionKey] ?? s}
            </Link>
          ))}
          {sections.size === 0 && (
            <p className="text-black/50">لم تُمنح صلاحيات بعد. تواصل مع صاحب المطعم.</p>
          )}
        </div>
      </div>
    );
  }

  // مالك → إحصائيات
  const supabase = await createClient();
  const [{ count: catCount }, { count: prodCount }, { count: orderCount }] = await Promise.all([
    supabase.from("categories").select("id", { count: "exact", head: true }).eq("restaurant_id", restaurant.id),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("restaurant_id", restaurant.id),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("restaurant_id", restaurant.id),
  ]);

  const stats = [
    { label: "الأقسام", value: catCount ?? 0, href: "/dashboard/menu" },
    { label: "المنتجات", value: prodCount ?? 0, href: "/dashboard/menu" },
    { label: "الطلبات", value: orderCount ?? 0, href: "/dashboard/analytics" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold">مرحباً بك في {restaurant.name} 👋</h1>
      <p className="text-black/60 mt-1">لوحة تحكم {labels.yourPlace}.</p>

      <div className="grid gap-4 sm:grid-cols-3 mt-6">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="rounded-2xl border border-black/10 p-5 bg-white hover:border-brand transition">
            <div className="text-3xl font-extrabold text-brand">{s.value}</div>
            <div className="text-sm text-black/60 mt-1">{s.label}</div>
          </Link>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/dashboard/menu" className="rounded-lg bg-brand text-white px-5 py-2.5 font-semibold hover:bg-brand-dark transition">
          إدارة المنيو
        </Link>
        <Link href="/dashboard/generate" className="rounded-lg border border-black/15 px-5 py-2.5 font-semibold hover:bg-black/5 transition">
          ✨ توليد منيو بالذكاء الاصطناعي
        </Link>
        <Link href="/dashboard/pos" className="rounded-lg border border-black/15 px-5 py-2.5 font-semibold hover:bg-black/5 transition">
          🧾 الكاشير
        </Link>
      </div>
    </div>
  );
}
