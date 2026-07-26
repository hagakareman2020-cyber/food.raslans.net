import { redirect } from "next/navigation";
import { getAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import AttendanceWidget from "@/components/AttendanceWidget";

type Row = {
  id: string;
  user_name: string | null;
  work_date: string;
  check_in_at: string | null;
  check_out_at: string | null;
  worked_minutes: number;
};

function cairoWorkDate(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo" }).format(d);
}
function fmtTime(iso: string | null) {
  return iso ? new Date(iso).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }) : "—";
}
function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("ar-EG", { weekday: "short", day: "numeric", month: "short" });
}
function fmtWorked(min: number) {
  if (!min) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h ? h + "س " : ""}${m}د`;
}

export default async function AttendancePage() {
  const access = await getAccess();
  if (!access) redirect("/dashboard");
  const { user, restaurant, isOwner } = access;

  const supabase = await createClient();
  const today = cairoWorkDate();

  // سجل اليوم الخاص بالمستخدم الحالي (لأداة الحضور/الانصراف)
  const { data: mine } = await supabase
    .from("attendance")
    .select("check_in_at, check_out_at")
    .eq("restaurant_id", restaurant.id)
    .eq("user_id", user.id)
    .eq("work_date", today)
    .maybeSingle();

  // السجل: المالك يرى كل موظفي الفرع، والموظف يرى سجله فقط (عبر RLS)
  const { data: rows } = await supabase
    .from("attendance")
    .select("id, user_name, work_date, check_in_at, check_out_at, worked_minutes")
    .eq("restaurant_id", restaurant.id)
    .order("work_date", { ascending: false })
    .order("check_in_at", { ascending: true })
    .limit(200);
  const history = (rows as Row[]) ?? [];

  const presentToday = history.filter((r) => r.work_date === today && r.check_in_at).length;

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-1">الحضور والانصراف</h1>
      <p className="text-black/60 mb-6">
        {isOwner ? `سجّل حضور موظفي فرع «${restaurant.name}».` : "سجّل حضورك وانصرافك اليومي."}
      </p>

      <div className="grid gap-5 md:grid-cols-2 mb-8">
        <AttendanceWidget checkInAt={mine?.check_in_at ?? null} checkOutAt={mine?.check_out_at ?? null} />
        {isOwner && (
          <div className="rounded-2xl border border-black/10 bg-white p-6 flex flex-col justify-center">
            <div className="text-sm text-black/50">حاضرون اليوم في هذا الفرع</div>
            <div className="text-4xl font-extrabold text-brand mt-1">{presentToday}</div>
            <div className="text-xs text-black/40 mt-1">{fmtDate(today)}</div>
          </div>
        )}
      </div>

      <h2 className="font-bold mb-3">{isOwner ? "سجل الحضور — الفرع الحالي" : "سجل حضوري"}</h2>
      {history.length === 0 ? (
        <p className="text-black/40 py-8 text-center rounded-2xl border border-black/10 bg-white">
          لا توجد سجلات بعد.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-black/10 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-black/50 border-b border-black/10">
                {isOwner && <th className="text-right p-3 font-semibold">الموظف</th>}
                <th className="text-right p-3 font-semibold">اليوم</th>
                <th className="text-center p-3 font-semibold">حضور</th>
                <th className="text-center p-3 font-semibold">انصراف</th>
                <th className="text-center p-3 font-semibold">ساعات العمل</th>
              </tr>
            </thead>
            <tbody>
              {history.map((r) => (
                <tr key={r.id} className="border-b border-black/5 last:border-0">
                  {isOwner && <td className="p-3 font-semibold">{r.user_name || "—"}</td>}
                  <td className="p-3">{fmtDate(r.work_date)}</td>
                  <td className="p-3 text-center">{fmtTime(r.check_in_at)}</td>
                  <td className="p-3 text-center">{fmtTime(r.check_out_at)}</td>
                  <td className="p-3 text-center font-semibold">{fmtWorked(r.worked_minutes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
