import { createAdminClient } from "@/lib/supabase/admin";
import CustomerMenu from "@/components/CustomerMenu";
import PoweredBy from "@/components/PoweredBy";
import { waterConfig } from "@/lib/water";
import type { Category, Product } from "@/lib/types";

export default async function CustomerMenuPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: table } = await admin
    .from("restaurant_tables")
    .select("id, table_number, restaurant_id")
    .eq("qr_token", token)
    .maybeSingle();

  if (!table) {
    return <Center>الكود غير صالح أو الترابيزة غير موجودة.</Center>;
  }

  const { data: restaurant } = await admin
    .from("restaurants")
    .select("id, name, logo_url, currency, status, settings")
    .eq("id", table.restaurant_id)
    .maybeSingle();

  if (!restaurant || restaurant.status !== "active") {
    return <Center>هذا المكان غير متاح حالياً.</Center>;
  }

  const [{ data: cats }, { data: prods }] = await Promise.all([
    admin.from("categories").select("*").eq("restaurant_id", restaurant.id).order("sort_order"),
    admin
      .from("products")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .eq("is_available", true)
      .eq("in_stock", true)
      .order("sort_order"),
  ]);

  return (
    <div className="flex-1 flex flex-col">
      <CustomerMenu
        token={token}
        tableNumber={table.table_number}
        restaurantName={restaurant.name}
        logoUrl={restaurant.logo_url}
        currency={restaurant.currency}
        waterBottles={waterConfig(restaurant.settings).bottles}
        waterPrice={waterConfig(restaurant.settings).price}
        categories={(cats as Category[]) ?? []}
        products={(prods as Product[]) ?? []}
      />
      <div className="py-4">
        <PoweredBy />
      </div>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 grid place-items-center p-8 text-center text-black/60">
      <div>
        <div className="text-5xl mb-3">🍽️</div>
        {children}
      </div>
    </div>
  );
}
