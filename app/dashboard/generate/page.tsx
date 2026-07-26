import { requireAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import MenuGenerator from "@/components/MenuGenerator";

export default async function GeneratePage() {
  const restaurant = await requireAccess("menu");

  const supabase = await createClient();
  const { data: versions } = await supabase
    .from("menu_versions")
    .select("id, content, is_approved, created_at")
    .eq("restaurant_id", restaurant.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">توليد المنيو بالذكاء الاصطناعي ✨</h1>
      <p className="text-black/60 dark:text-white/60 mb-6">
        يولّد النظام منيو منسّقاً بناءً على منتجاتك الحالية عبر Groq. يمكنك التوليد
        مجدداً كل 60 ثانية، واختيار أي نسخة سابقة واعتمادها.
      </p>
      <MenuGenerator
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        initialVersions={(versions as any) ?? []}
        currency={restaurant.currency}
        restaurantName={restaurant.name}
        logoUrl={restaurant.logo_url}
      />
    </div>
  );
}
