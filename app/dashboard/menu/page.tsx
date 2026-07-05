import { requireAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import MenuManager from "@/components/MenuManager";
import type { Category, Product } from "@/lib/types";

export default async function MenuPage() {
  const restaurant = await requireAccess("menu");

  const supabase = await createClient();
  const [{ data: categories }, { data: products }] = await Promise.all([
    supabase
      .from("categories")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("products")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .order("created_at", { ascending: true }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">إدارة المنيو</h1>
      <p className="text-black/60 dark:text-white/60 mb-6">
        أضف الأقسام والمنتجات. كل منتج له اسم ومكونات وسعر وصورة ومدة تحضير.
      </p>
      <MenuManager
        restaurantId={restaurant.id}
        currency={restaurant.currency}
        categories={(categories as Category[]) ?? []}
        products={(products as Product[]) ?? []}
      />
    </div>
  );
}
