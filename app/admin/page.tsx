import { createAdminClient } from "@/lib/supabase/admin";
import {
  approveRestaurant,
  suspendRestaurant,
  rejectRestaurant,
} from "@/lib/actions/admin";
import type { Restaurant } from "@/lib/types";

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  pending: { label: "قيد المراجعة", cls: "bg-amber-100 text-amber-800" },
  active: { label: "مقبول", cls: "bg-green-100 text-green-800" },
  suspended: { label: "موقوف", cls: "bg-gray-200 text-gray-700" },
  rejected: { label: "مرفوض", cls: "bg-red-100 text-red-700" },
};

export default async function AdminPage() {
  const admin = createAdminClient();

  const { data: restaurants } = await admin
    .from("restaurants")
    .select("*")
    .order("created_at", { ascending: false });

  // خريطة owner_id -> email
  const { data: usersList } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const emailById = new Map(usersList?.users.map((u) => [u.id, u.email]) ?? []);

  const list = (restaurants as Restaurant[]) ?? [];
  const pending = list.filter((r) => r.status === "pending");
  const others = list.filter((r) => r.status !== "pending");

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-bold mb-1">طلبات المطاعم</h1>
        <p className="text-black/60 dark:text-white/60">
          راجع الطلبات الجديدة ووافق أو ارفض.
        </p>
      </section>

      {/* قيد المراجعة */}
      <section>
        <h2 className="font-bold mb-3 flex items-center gap-2">
          🟡 قيد المراجعة
          <span className="text-sm bg-amber-100 text-amber-800 rounded-full px-2">
            {pending.length}
          </span>
        </h2>
        {pending.length === 0 ? (
          <p className="text-sm text-black/40">لا توجد طلبات جديدة.</p>
        ) : (
          <div className="space-y-3">
            {pending.map((r) => (
              <RestaurantRow key={r.id} r={r} email={emailById.get(r.owner_id)} showApprove />
            ))}
          </div>
        )}
      </section>

      {/* الباقي */}
      <section>
        <h2 className="font-bold mb-3">كل المطاعم</h2>
        {others.length === 0 ? (
          <p className="text-sm text-black/40">لا يوجد.</p>
        ) : (
          <div className="space-y-3">
            {others.map((r) => (
              <RestaurantRow key={r.id} r={r} email={emailById.get(r.owner_id)} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function RestaurantRow({
  r,
  email,
  showApprove,
}: {
  r: Restaurant;
  email?: string | null;
  showApprove?: boolean;
}) {
  const st = STATUS_LABELS[r.status] ?? STATUS_LABELS.pending;
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-black/10 dark:border-white/10 p-4 bg-white/60 dark:bg-white/5">
      {r.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={r.logo_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
      ) : (
        <div className="w-12 h-12 rounded-lg bg-black/5 dark:bg-white/10 grid place-items-center">🍽️</div>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-bold flex items-center gap-2">
          {r.name}
          <span className={`text-[11px] rounded-full px-2 py-0.5 ${st.cls}`}>{st.label}</span>
        </div>
        <div className="text-xs text-black/50">
          {email ?? "—"} · {new Date(r.created_at).toLocaleDateString("ar-EG")}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {(showApprove || r.status !== "active") && (
          <form action={approveRestaurant}>
            <input type="hidden" name="id" value={r.id} />
            <button className="text-sm rounded-lg bg-green-600 text-white px-4 py-1.5 hover:bg-green-700">
              قبول
            </button>
          </form>
        )}
        {r.status === "active" && (
          <form action={suspendRestaurant}>
            <input type="hidden" name="id" value={r.id} />
            <button className="text-sm rounded-lg border px-4 py-1.5 hover:bg-black/5">
              إيقاف
            </button>
          </form>
        )}
        {r.status === "pending" && (
          <form action={rejectRestaurant}>
            <input type="hidden" name="id" value={r.id} />
            <button className="text-sm rounded-lg border border-red-300 text-red-600 px-4 py-1.5 hover:bg-red-50">
              رفض
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
