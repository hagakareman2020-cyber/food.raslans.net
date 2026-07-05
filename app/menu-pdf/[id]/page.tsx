import { notFound, redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import ThemedMenu, { type ThemedMenuContent } from "@/components/ThemedMenu";
import PrintTrigger from "@/components/PrintTrigger";

export default async function MenuPdfPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getUser();
  if (!user) redirect("/login");
  const { id } = await params;

  const supabase = await createClient();
  const { data: version } = await supabase
    .from("menu_versions")
    .select("id, content, restaurant_id")
    .eq("id", id)
    .maybeSingle();
  if (!version) notFound();

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("name, logo_url, currency")
    .eq("id", version.restaurant_id)
    .maybeSingle();
  if (!restaurant) notFound();

  const content = version.content as ThemedMenuContent;

  return (
    <div className="min-h-screen bg-white p-4 sm:p-8 print-root">
      <style>{`
        @page { margin: 8mm; }
        @media print {
          .no-print { display: none !important; }
          .print-root { padding: 0 !important; }
        }
        .print-root, .print-root * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      `}</style>
      <PrintTrigger />
      <div className="max-w-3xl mx-auto">
        <ThemedMenu
          content={content}
          restaurantName={restaurant.name}
          logoUrl={restaurant.logo_url}
          currency={restaurant.currency}
        />
      </div>
    </div>
  );
}
