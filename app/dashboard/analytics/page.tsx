import Link from "next/link";
import { requireAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import AiAdvice from "@/components/AiAdvice";
import ZReportButton from "@/components/ZReportButton";

type Range = "today" | "week" | "month";

function startOf(range: Range): Date {
  const d = new Date();
  if (range === "today") d.setHours(0, 0, 0, 0);
  else if (range === "week") d.setDate(d.getDate() - 7);
  else d.setDate(d.getDate() - 30);
  return d;
}

const RANGE_LABEL: Record<Range, string> = { today: "اليوم", week: "آخر أسبوع", month: "آخر شهر" };

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const restaurant = await requireAccess("analytics");
  const sp = await searchParams;
  const range: Range = (["today", "week", "month"].includes(sp.range || "") ? sp.range : "week") as Range;

  const supabase = await createClient();
  const startIso = startOf(range).toISOString();

  const { data: orders } = await supabase
    .from("orders")
    .select("id, total, status, created_at, order_items(name_ar, quantity, price, product_id, is_free)")
    .eq("restaurant_id", restaurant.id)
    .neq("status", "cancelled")
    .gte("created_at", startIso);

  const list = orders ?? [];
  const totalSales = list.reduce((s, o) => s + Number(o.total), 0);
  const orderCount = list.length;
  const avg = orderCount ? Math.round(totalSales / orderCount) : 0;

  // أفضل المنتجات
  const prodMap = new Map<string, { qty: number; revenue: number }>();
  for (const o of list) {
    for (const it of o.order_items ?? []) {
      if (it.is_free) continue;
      const cur = prodMap.get(it.name_ar) ?? { qty: 0, revenue: 0 };
      cur.qty += it.quantity;
      cur.revenue += Number(it.price) * it.quantity;
      prodMap.set(it.name_ar, cur);
    }
  }
  const best = [...prodMap.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.qty - a.qty);

  // التقييمات (متوسط لكل منتج)
  const orderIds = list.map((o) => o.id);
  const { data: ratings } = orderIds.length
    ? await supabase.from("order_ratings").select("product_id, rating").in("order_id", orderIds)
    : { data: [] };
  const ratingMap = new Map<string, { sum: number; n: number }>();
  for (const r of ratings ?? []) {
    if (!r.product_id) continue;
    const c = ratingMap.get(r.product_id) ?? { sum: 0, n: 0 };
    c.sum += r.rating; c.n += 1;
    ratingMap.set(r.product_id, c);
  }
  const avgRatings = [...ratingMap.entries()].map(([, v]) => v.sum / v.n);
  const overallRating = avgRatings.length ? (avgRatings.reduce((a, b) => a + b, 0) / avgRatings.length).toFixed(1) : "—";

  // تقرير اليوم (Z-Report)
  const todayStart = startOf("today").toISOString();
  const { data: todayOrders } = await supabase
    .from("orders")
    .select("total, status")
    .eq("restaurant_id", restaurant.id)
    .neq("status", "cancelled")
    .gte("created_at", todayStart);
  const todaySales = (todayOrders ?? []).reduce((s, o) => s + Number(o.total), 0);
  const todayCount = (todayOrders ?? []).length;

  const summary = {
    range: RANGE_LABEL[range],
    totalSales,
    orderCount,
    avgOrder: avg,
    currency: restaurant.currency,
    bestProducts: best.slice(0, 8),
    worstProducts: best.slice(-3).reverse(),
  };

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <h1 className="text-2xl font-bold">المحاسبة والتحليل</h1>
        <ZReportButton
          restaurantName={restaurant.name}
          currency={restaurant.currency}
          sales={todaySales}
          count={todayCount}
        />
      </div>

      {/* فترات */}
      <div className="flex gap-2 mb-6">
        {(["today", "week", "month"] as Range[]).map((r) => (
          <Link
            key={r}
            href={`/dashboard/analytics?range=${r}`}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
              range === r ? "bg-brand text-white" : "bg-black/5 hover:bg-black/10"
            }`}
          >
            {RANGE_LABEL[r]}
          </Link>
        ))}
      </div>

      {/* إحصائيات */}
      <div className="grid gap-4 sm:grid-cols-4 mb-8">
        <Stat label="إجمالي المبيعات" value={`${totalSales} ${restaurant.currency}`} />
        <Stat label="عدد الطلبات" value={orderCount} />
        <Stat label="متوسط الطلب" value={`${avg} ${restaurant.currency}`} />
        <Stat label="متوسط التقييم" value={`${overallRating} ⭐`} />
      </div>

      {/* أفضل المنتجات */}
      <div className="grid lg:grid-cols-2 gap-6">
        <section className="rounded-2xl border border-black/10 bg-white p-5">
          <h2 className="font-bold mb-3">🏆 أفضل المنتجات ({RANGE_LABEL[range]})</h2>
          {best.length === 0 ? (
            <p className="text-black/40 text-sm">لا مبيعات في هذه الفترة.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-black/50 text-right border-b border-black/10">
                  <th className="py-2 font-medium">المنتج</th>
                  <th className="py-2 font-medium">الكمية</th>
                  <th className="py-2 font-medium">الإيراد</th>
                </tr>
              </thead>
              <tbody>
                {best.slice(0, 10).map((p, i) => (
                  <tr key={p.name} className="border-b border-black/5">
                    <td className="py-2">{i + 1}. {p.name}</td>
                    <td className="py-2 font-bold">{p.qty}</td>
                    <td className="py-2 text-brand font-bold">{p.revenue} {restaurant.currency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* نصائح AI */}
        <AiAdvice summary={summary} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-5">
      <div className="text-2xl font-extrabold text-brand">{value}</div>
      <div className="text-sm text-black/60 mt-1">{label}</div>
    </div>
  );
}
