import { redirect } from "next/navigation";
import { getAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import AttendanceWidget from "@/components/AttendanceWidget";
import { createShift, deleteShift, assignStaffShift } from "@/lib/actions/shifts";
import { markAllNotificationsRead } from "@/lib/actions/notifications";
import { hasFaceEnrolled, type Geofence } from "@/lib/attendanceLogic";

type Row = {
  id: string;
  user_name: string | null;
  work_date: string;
  check_in_at: string | null;
  check_out_at: string | null;
  worked_minutes: number;
  late_minutes: number | null;
  overtime_minutes: number | null;
  within_geofence: boolean | null;
  selfie_url: string | null;
};
type Shift = { id: string; name: string; start_time: string | null; end_time: string | null; grace_minutes: number };
type StaffLite = { id: string; user_id: string; role: string; shift_id: string | null };

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
function fmtHM(t: string | null) {
  return t ? t.slice(0, 5) : "—";
}

export default async function AttendancePage() {
  const access = await getAccess();
  if (!access) redirect("/dashboard");
  const { user, restaurant, isOwner } = access;

  const supabase = await createClient();
  const today = cairoWorkDate();

  const geo = (restaurant.settings as { geofence?: Geofence } | null)?.geofence;
  const selfieOn = !!(restaurant.settings as { attendance_selfie?: boolean } | null)?.attendance_selfie;
  const faceOn = !!(restaurant.settings as { attendance_face?: boolean } | null)?.attendance_face;

  // سجل اليوم الخاص بالمستخدم الحالي (لأداة الحضور/الانصراف)
  const { data: mine } = await supabase
    .from("attendance")
    .select("check_in_at, check_out_at")
    .eq("restaurant_id", restaurant.id)
    .eq("user_id", user.id)
    .eq("work_date", today)
    .maybeSingle();

  // صف الموظف الحالي (لبصمة الوجه) — المالك بلا صف
  const { data: myStaff } = await supabase
    .from("staff")
    .select("face_descriptor")
    .eq("restaurant_id", restaurant.id)
    .eq("user_id", user.id)
    .maybeSingle();
  const faceRequired = faceOn && !isOwner && !!myStaff;
  const faceEnrolled = hasFaceEnrolled(myStaff?.face_descriptor);

  // السجل: المالك يرى كل موظفي الفرع، والموظف يرى سجله فقط (عبر RLS)
  const { data: rows } = await supabase
    .from("attendance")
    .select(
      "id, user_name, work_date, check_in_at, check_out_at, worked_minutes, late_minutes, overtime_minutes, within_geofence, selfie_url"
    )
    .eq("restaurant_id", restaurant.id)
    .order("work_date", { ascending: false })
    .order("check_in_at", { ascending: true })
    .limit(200);
  const history = (rows as Row[]) ?? [];
  const presentToday = history.filter((r) => r.work_date === today && r.check_in_at).length;

  // تنبيهات المالك (تأخير/غياب)
  let notifs: { id: string; title: string; body: string | null; is_read: boolean; created_at: string }[] = [];
  if (isOwner) {
    const { data: nd } = await supabase
      .from("notifications")
      .select("id, title, body, is_read, created_at")
      .eq("restaurant_id", restaurant.id)
      .order("created_at", { ascending: false })
      .limit(10);
    notifs = nd ?? [];
  }
  const unread = notifs.filter((n) => !n.is_read).length;

  // بيانات إدارة الشيفتات (للمالك فقط)
  let shifts: Shift[] = [];
  let staff: StaffLite[] = [];
  let nameMap = new Map<string, string>();
  if (isOwner) {
    const [{ data: sh }, { data: st }] = await Promise.all([
      supabase.from("shifts").select("*").eq("restaurant_id", restaurant.id).order("start_time"),
      supabase.from("staff").select("id, user_id, role, shift_id").eq("restaurant_id", restaurant.id),
    ]);
    shifts = (sh as Shift[]) ?? [];
    staff = (st as StaffLite[]) ?? [];
    const ids = staff.map((s) => s.user_id);
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      nameMap = new Map((profs ?? []).map((p: { id: string; full_name: string | null }) => [p.id, p.full_name || "موظف"]));
    }
  }

  const ROLE_AR: Record<string, string> = { accountant: "محاسب", chef: "شيف", assistant: "مساعد" };

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-1">الحضور والانصراف</h1>
      <p className="text-black/60 mb-6">
        {isOwner ? `سجّل حضور موظفي فرع «${restaurant.name}».` : "سجّل حضورك وانصرافك اليومي."}
      </p>

      <div className="grid gap-5 md:grid-cols-2 mb-8">
        <AttendanceWidget
          checkInAt={mine?.check_in_at ?? null}
          checkOutAt={mine?.check_out_at ?? null}
          geofenceEnabled={!!geo?.enabled}
          selfieEnabled={selfieOn}
          faceRequired={faceRequired}
          faceEnrolled={faceEnrolled}
        />
        {isOwner && (
          <div className="rounded-2xl border border-black/10 bg-white p-6 flex flex-col justify-center">
            <div className="text-sm text-black/50">حاضرون اليوم في هذا الفرع</div>
            <div className="text-4xl font-extrabold text-brand mt-1">{presentToday}</div>
            <div className="text-xs text-black/40 mt-1">{fmtDate(today)}</div>
          </div>
        )}
      </div>

      {/* تنبيهات المالك */}
      {isOwner && notifs.length > 0 && (
        <div className="rounded-2xl border border-black/10 bg-white p-6 mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold">
              🔔 التنبيهات {unread > 0 && <span className="text-xs bg-red-100 text-red-700 rounded-full px-2 py-0.5">{unread} جديد</span>}
            </h2>
            {unread > 0 && (
              <form action={markAllNotificationsRead}>
                <button className="text-xs text-brand hover:underline">تحديد الكل كمقروء</button>
              </form>
            )}
          </div>
          <ul className="space-y-2">
            {notifs.map((n) => (
              <li key={n.id} className={`text-sm rounded-lg px-3 py-2 ${n.is_read ? "bg-black/[0.03] text-black/60" : "bg-amber-50 text-amber-900"}`}>
                <b>{n.title}</b> — {n.body}
                <span className="text-xs text-black/40 block mt-0.5">
                  {new Date(n.created_at).toLocaleString("ar-EG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* إدارة الشيفتات وإسنادها — للمالك */}
      {isOwner && (
        <div className="grid gap-5 lg:grid-cols-2 mb-8">
          <div className="rounded-2xl border border-black/10 bg-white p-6">
            <h2 className="font-bold mb-3">⏱️ شيفتات الفرع</h2>
            {shifts.length > 0 ? (
              <ul className="space-y-2 mb-4">
                {shifts.map((s) => (
                  <li key={s.id} className="flex items-center justify-between text-sm border-b border-black/5 pb-2">
                    <span>
                      <b>{s.name}</b>{" "}
                      <span className="text-black/50" dir="ltr">
                        {fmtHM(s.start_time)}–{fmtHM(s.end_time)}
                      </span>{" "}
                      <span className="text-black/40">· سماح {s.grace_minutes}د</span>
                    </span>
                    <form action={deleteShift}>
                      <input type="hidden" name="id" value={s.id} />
                      <button className="text-red-600 text-xs hover:underline">حذف</button>
                    </form>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-black/40 mb-4">لا توجد شيفتات بعد.</p>
            )}
            <form action={createShift} className="space-y-2">
              <input
                name="name"
                required
                placeholder="اسم الشيفت (مثال: صباحي)"
                className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm outline-none focus:border-brand"
              />
              <div className="grid grid-cols-3 gap-2">
                <label className="text-xs text-black/50">بداية
                  <input type="time" name="start_time" className="mt-1 w-full rounded-lg border border-black/15 px-2 py-1.5 text-sm" />
                </label>
                <label className="text-xs text-black/50">نهاية
                  <input type="time" name="end_time" className="mt-1 w-full rounded-lg border border-black/15 px-2 py-1.5 text-sm" />
                </label>
                <label className="text-xs text-black/50">سماح (د)
                  <input type="number" name="grace_minutes" min={0} max={120} defaultValue={15} className="mt-1 w-full rounded-lg border border-black/15 px-2 py-1.5 text-sm" />
                </label>
              </div>
              <button className="rounded-lg bg-brand text-white px-4 py-2 text-sm font-semibold hover:bg-brand-dark">
                إضافة شيفت
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-black/10 bg-white p-6">
            <h2 className="font-bold mb-3">👥 إسناد الشيفتات للموظفين</h2>
            {staff.length === 0 ? (
              <p className="text-sm text-black/40">لا يوجد موظفون في هذا الفرع بعد.</p>
            ) : (
              <ul className="space-y-2">
                {staff.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate">
                      {nameMap.get(s.user_id) || "موظف"}{" "}
                      <span className="text-black/40">· {ROLE_AR[s.role] ?? s.role}</span>
                    </span>
                    <form action={assignStaffShift} className="flex items-center gap-1">
                      <input type="hidden" name="staff_id" value={s.id} />
                      <select
                        name="shift_id"
                        defaultValue={s.shift_id ?? ""}
                        className="rounded-lg border border-black/15 px-2 py-1.5 text-sm outline-none focus:border-brand"
                      >
                        <option value="">بدون شيفت</option>
                        {shifts.map((sh) => (
                          <option key={sh.id} value={sh.id}>
                            {sh.name}
                          </option>
                        ))}
                      </select>
                      <button className="rounded-lg border border-black/15 px-3 py-1.5 text-xs hover:bg-black/5">حفظ</button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

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
                <th className="text-center p-3 font-semibold">تأخير</th>
                <th className="text-center p-3 font-semibold">أوفرتايم</th>
                {isOwner && <th className="text-center p-3 font-semibold">تحقّق</th>}
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
                  <td className="p-3 text-center">
                    {r.late_minutes ? <span className="text-red-600 font-semibold">{r.late_minutes}د</span> : "—"}
                  </td>
                  <td className="p-3 text-center">
                    {r.overtime_minutes ? <span className="text-green-600 font-semibold">{r.overtime_minutes}د</span> : "—"}
                  </td>
                  {isOwner && (
                    <td className="p-3 text-center">
                      <span className="inline-flex items-center gap-1">
                        {r.within_geofence === true && <span title="داخل النطاق">📍</span>}
                        {r.within_geofence === false && <span title="خارج النطاق" className="text-red-600">⚠️</span>}
                        {r.selfie_url && (
                          <a href={r.selfie_url} target="_blank" rel="noreferrer">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={r.selfie_url} alt="" className="w-7 h-7 rounded object-cover border" />
                          </a>
                        )}
                        {r.within_geofence == null && !r.selfie_url && "—"}
                      </span>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
