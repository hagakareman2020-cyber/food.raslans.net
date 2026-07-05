import { requireAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import PosTerminal from "@/components/PosTerminal";
import type { Category, Product } from "@/lib/types";

export default async function PosPage() {
  const restaurant = await requireAccess("pos");

  const supabase = await createClient();
  const [{ data: cats }, { data: prods }, { data: tables }] = await Promise.all([
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
  ]);

  return (
    <div className="-m-6">
      <PosTerminal
        restaurantName={restaurant.name}
        currency={restaurant.currency}
        categories={(cats as Category[]) ?? []}
        products={(prods as Product[]) ?? []}
        tableNumbers={(tables ?? []).map((t) => t.table_number as number)}
      />
    </div>
  );
}
