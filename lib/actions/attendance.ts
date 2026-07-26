"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveRestaurant } from "@/lib/auth";
import {
  haversineMeters,
  computeLateMinutes,
  computeOvertimeMinutes,
  matchFace,
  hasFaceEnrolled,
  type Shift,
  type Geofence,
} from "@/lib/attendanceLogic";

export type AttendanceState = { error?: string; ok?: boolean; late?: number } | null;

export type CheckInInput = {
  lat?: number | null;
  lng?: number | null;
  accuracy?: number | null;
  selfieUrl?: string | null;
  faceDescriptor?: number[] | null;
  deviceId?: string | null;
};

type StaffRow = {
  id: string;
  shift_id: string | null;
  face_descriptor: unknown;
  device_id: string | null;
};

function cairoWorkDate(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo" }).format(d);
}

async function getStaffRow(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  restaurantId: string
): Promise<StaffRow | null> {
  const { data } = await supabase
    .from("staff")
    .select("id, shift_id, face_descriptor, device_id")
    .eq("user_id", userId)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();
  return (data as StaffRow) ?? null;
}

async function getShift(
  supabase: Awaited<ReturnType<typeof createClient>>,
  shiftId: string | null
): Promise<Shift | null> {
  if (!shiftId) return null;
  const { data } = await supabase
    .from("shifts")
    .select("start_time, end_time, grace_minutes")
    .eq("id", shiftId)
    .maybeSingle();
  return (data as Shift) ?? null;
}

// تسجيل الحضور: نطاق جغرافي + ربط الجهاز + بصمة الوجه + التأخير + إشعار
export async function checkIn(input: CheckInInput = {}): Promise<AttendanceState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "غير مصرح" };

  const restaurant = await getActiveRestaurant();
  if (!restaurant) return { error: "لا يوجد فرع" };

  const staff = await getStaffRow(supabase, user.id, restaurant.id);

  // 1) ربط الجهاز (للموظفين فقط) — يُمنع من جهاز مختلف
  if (staff && staff.device_id && input.deviceId && staff.device_id !== input.deviceId) {
    return { error: "هذا الجهاز غير معتمد لحسابك. اطلب من المدير إعادة تعيين الجهاز." };
  }

  // 2) بصمة الوجه (لو الموظف مسجّل بصمته) — يُرفض عدم التطابق
  let faceScore: number | null = null;
  if (staff && hasFaceEnrolled(staff.face_descriptor)) {
    if (!input.faceDescriptor) {
      return { error: "مطلوب التحقق ببصمة الوجه لتسجيل الحضور." };
    }
    const res = matchFace(staff.face_descriptor, input.faceDescriptor);
    faceScore = res.score;
    if (res.match === false) {
      return { error: "الوجه لا يطابق الموظف المسجّل. حاول بإضاءة أفضل ومواجهة الكاميرا." };
    }
  }

  // 3) النطاق الجغرافي (Geofence)
  const geo = (restaurant.settings as { geofence?: Geofence } | null)?.geofence;
  let within: boolean | null = null;
  if (geo?.enabled && geo.lat != null && geo.lng != null) {
    if (input.lat == null || input.lng == null) {
      return { error: "لتسجيل الحضور يجب السماح بالوصول للموقع." };
    }
    const dist = haversineMeters(input.lat, input.lng, geo.lat, geo.lng);
    within = dist <= (geo.radius_m || 100);
    if (!within) {
      return {
        error: `أنت خارج نطاق الفرع (المسافة ${Math.round(dist)} م، المسموح ${
          geo.radius_m || 100
        } م).`,
      };
    }
  }

  const work_date = cairoWorkDate();
  const { data: prof } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();
  const user_name = prof?.full_name || user.email || "موظف";

  const { data: existing } = await supabase
    .from("attendance")
    .select("id, check_in_at")
    .eq("restaurant_id", restaurant.id)
    .eq("user_id", user.id)
    .eq("work_date", work_date)
    .maybeSingle();
  if (existing?.check_in_at) return { error: "سجّلت حضورك بالفعل اليوم" };

  const now = new Date();
  const shift = await getShift(supabase, staff?.shift_id ?? null);
  const late = computeLateMinutes(now, shift);

  const row = {
    check_in_at: now.toISOString(),
    check_in_lat: input.lat ?? null,
    check_in_lng: input.lng ?? null,
    check_in_accuracy: input.accuracy ?? null,
    within_geofence: within,
    selfie_url: input.selfieUrl ?? null,
    face_match_score: faceScore,
    late_minutes: late,
    status: late > 0 ? "late" : "present",
    method: input.faceDescriptor ? "face" : input.lat != null ? "gps" : "manual",
  };

  if (existing) {
    const { error } = await supabase.from("attendance").update(row).eq("id", existing.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("attendance").insert({
      restaurant_id: restaurant.id,
      user_id: user.id,
      user_name,
      work_date,
      ...row,
    });
    if (error) return { error: error.message };
  }

  // ربط الجهاز عند أول تسجيل (عبر السيرفر لأن الموظف لا يملك صلاحية تعديل صفّه)
  if (staff && !staff.device_id && input.deviceId) {
    const admin = createAdminClient();
    await admin
      .from("staff")
      .update({ device_id: input.deviceId, device_registered_at: now.toISOString() })
      .eq("id", staff.id);
  }

  // إشعار المالك عند التأخير (داخل التطبيق + Push للجهاز)
  if (late > 0) {
    const admin = createAdminClient();
    const title = "تنبيه تأخير";
    const body = `${user_name} سجّل حضوره متأخراً ${late} دقيقة`;
    await admin.from("notifications").insert({ restaurant_id: restaurant.id, title, body, kind: "late" });
    try {
      const { data: toks } = await admin.from("push_tokens").select("token").eq("user_id", restaurant.owner_id);
      const tokens = (toks ?? []).map((t: { token: string }) => t.token);
      if (tokens.length) {
        const { sendPush } = await import("@/lib/fcm");
        const { invalid } = await sendPush(tokens, title, body, "/dashboard/attendance");
        if (invalid.length) await admin.from("push_tokens").delete().in("token", invalid);
      }
    } catch {
      /* Push أفضل جهد — لا يعطّل تسجيل الحضور */
    }
  }

  revalidatePath("/dashboard/attendance");
  return { ok: true, late };
}

// تسجيل الانصراف + دقائق العمل والأوفرتايم
export async function checkOut(input: CheckInInput = {}): Promise<AttendanceState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "غير مصرح" };

  const restaurant = await getActiveRestaurant();
  if (!restaurant) return { error: "لا يوجد فرع" };

  const work_date = cairoWorkDate();
  const { data: row } = await supabase
    .from("attendance")
    .select("id, check_in_at, check_out_at")
    .eq("restaurant_id", restaurant.id)
    .eq("user_id", user.id)
    .eq("work_date", work_date)
    .maybeSingle();

  if (!row?.check_in_at) return { error: "سجّل حضورك أولاً" };
  if (row.check_out_at) return { error: "سجّلت انصرافك بالفعل" };

  const now = new Date();
  const worked = Math.max(0, Math.round((now.getTime() - new Date(row.check_in_at).getTime()) / 60000));
  const staff = await getStaffRow(supabase, user.id, restaurant.id);
  const shift = await getShift(supabase, staff?.shift_id ?? null);
  const overtime = computeOvertimeMinutes(now, shift);

  const { error } = await supabase
    .from("attendance")
    .update({
      check_out_at: now.toISOString(),
      check_out_lat: input.lat ?? null,
      check_out_lng: input.lng ?? null,
      worked_minutes: worked,
      overtime_minutes: overtime,
    })
    .eq("id", row.id);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/attendance");
  return { ok: true };
}

// حفظ بصمة وجه الموظف الحالي (عبر السيرفر — تحقّق الملكية)
export async function saveFaceDescriptor(descriptors: number[][]): Promise<AttendanceState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "غير مصرح" };
  const restaurant = await getActiveRestaurant();
  if (!restaurant) return { error: "لا يوجد فرع" };

  const staff = await getStaffRow(supabase, user.id, restaurant.id);
  if (!staff) return { error: "بصمة الوجه متاحة للموظفين فقط" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("staff")
    .update({ face_descriptor: descriptors })
    .eq("id", staff.id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/attendance");
  return { ok: true };
}

// إعادة تعيين جهاز الموظف (للمالك) — يسمح بالتسجيل من جهاز جديد
export async function resetStaffDevice(formData: FormData): Promise<void> {
  const { getMyRestaurant } = await import("@/lib/auth");
  const restaurant = await getMyRestaurant();
  if (!restaurant) return;
  const staff_id = String(formData.get("staff_id") || "");
  if (!staff_id) return;
  const admin = createAdminClient();
  await admin
    .from("staff")
    .update({ device_id: null, device_registered_at: null })
    .eq("id", staff_id)
    .eq("restaurant_id", restaurant.id);
  revalidatePath("/dashboard/staff");
  revalidatePath("/dashboard/attendance");
}
