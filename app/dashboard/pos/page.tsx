import { requireAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import PosScreen from "@/components/PosScreen";
import type { Category, Product } from "@/lib/types";

export default async function PosPage() {
  const restaurant = await requireAccess("pos");

  const supabase = await createClient();
  const [{ data: cats }, { data: prods }, { data: tables }, { data: openOrders }] = await Promise.all([
    supabase.from("categories").select("*").eq("restaurant_id", restaurant.id).order("sort_order"),
    supabase
      .from("products")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .eq("is_available", true)
      .eq("in_stock", true)
      .order("sort_order"),
    supabase
      .from("restaurant_tables")
      .select("table_number")
      .eq("restaurant_id", restaurant.id)
      .order("table_number"),
    supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("restaurant_id", restaurant.id)
      .in("status", ["received", "preparing", "ready"])
      .order("created_at", { ascending: true }),
  ]);

  return (
    <div className="-m-6">
      <PosScreen
        restaurantId={restaurant.id}
        restaurantName={restaurant.name}
        currency={restaurant.currency}
        categories={(cats as Category[]) ?? []}
        products={(prods as Product[]) ?? []}
        tableNumbers={(tables ?? []).map((t) => t.table_number as number)}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        initialOrders={(openOrders as any) ?? []}
      />
    </div>
  );
}
