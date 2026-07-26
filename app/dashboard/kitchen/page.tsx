import { requireAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import KitchenBoard from "@/components/KitchenBoard";
import { businessLabels } from "@/lib/businessType";

export default async function KitchenPage() {
  const restaurant = await requireAccess("kitchen");
  const labels = businessLabels(restaurant.settings);

  const supabase = await createClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("restaurant_id", restaurant.id)
    .in("status", ["received", "preparing", "ready"])
    .order("created_at", { ascending: true });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">{labels.kitchenBoard}</h1>
      <p className="text-black/60 mb-6">الطلبات تصل هنا تلقائياً فور إرسالها من العميل — بدون تحديث.</p>
      <KitchenBoard
        restaurantId={restaurant.id}
        currency={restaurant.currency}
        emptyIcon={labels.emptyOrdersIcon}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        initialOrders={(orders as any) ?? []}
      />
    </div>
  );
}
