import { requireAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import InventoryManager from "@/components/InventoryManager";

export default async function InventoryPage() {
  const restaurant = await requireAccess("inventory");

  const supabase = await createClient();
  const [{ data: items }, { data: products }] = await Promise.all([
    supabase.from("inventory_items").select("*").eq("restaurant_id", restaurant.id).order("name"),
    supabase.from("products").select("id, name_ar, in_stock").eq("restaurant_id", restaurant.id).order("sort_order"),
  ]);

  const prodIds = (products ?? []).map((p) => p.id);
  const { data: links } = prodIds.length
    ? await supabase.from("product_ingredients").select("product_id, inventory_item_id, amount").in("product_id", prodIds)
    : { data: [] };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">المخزون</h1>
      <p className="text-black/60 mb-6">
        تابع خاماتك، واربطها بالمنتجات ليُخفى الطبق تلقائياً عند نفاد أي مكوّن.
      </p>
      <InventoryManager
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        items={(items as any) ?? []}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        products={(products as any) ?? []}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        links={(links as any) ?? []}
      />
    </div>
  );
}
