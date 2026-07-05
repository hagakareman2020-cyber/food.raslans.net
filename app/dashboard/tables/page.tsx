import { requireAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { addTables } from "@/lib/actions/tables";
import TableCard from "@/components/TableCard";

type TableRow = { id: string; table_number: number; qr_token: string };

export default async function TablesPage() {
  const restaurant = await requireAccess("tables");

  const supabase = await createClient();
  const { data: tables } = await supabase
    .from("restaurant_tables")
    .select("id, table_number, qr_token")
    .eq("restaurant_id", restaurant.id)
    .order("table_number");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const list = (tables as TableRow[]) ?? [];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">الترابيزات وأكواد QR</h1>
      <p className="text-black/60 mb-6">
        لكل ترابيزة كود QR خاص مدموج فيه لوجو مطعمك. اطبعه أو حمّله PDF وضعه على الطاولة.
      </p>

      <form action={addTables} className="flex items-end gap-3 mb-8 rounded-2xl border border-black/10 p-4 bg-white">
        <div>
          <label className="block text-sm mb-1">عدد الترابيزات المراد إضافتها</label>
          <input
            type="number"
            name="count"
            min={1}
            max={50}
            defaultValue={1}
            className="w-32 rounded-lg border border-black/15 px-3 py-2 outline-none focus:border-brand"
          />
        </div>
        <button className="rounded-lg bg-brand text-white px-5 py-2 font-semibold hover:bg-brand-dark">
          ➕ إضافة
        </button>
      </form>

      {list.length === 0 ? (
        <p className="text-black/50">لا توجد ترابيزات بعد. أضف واحدة للبدء.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((t) => (
            <TableCard
              key={t.id}
              id={t.id}
              tableNumber={t.table_number}
              url={`${siteUrl}/t/${t.qr_token}`}
              restaurantName={restaurant.name}
              logoUrl={restaurant.logo_url}
            />
          ))}
        </div>
      )}
    </div>
  );
}
