-- ============================================================
--  نظام الحضور والانصراف الكامل — ملف واحد شامل
--  شغّله مرة واحدة في: Supabase Dashboard > SQL Editor
--  آمن للتشغيل المتكرر (idempotent). يعتمد فقط على أن attendance.sql الأساسي سبق تشغيله
--  (الذي أنشأ جدول attendance ودوال is_owner_of / is_member_of).
--  يجمع كل الترقيات: الشيفتات + النطاق الجغرافي + التأخير/الأوفرتايم +
--                     بصمة الوجه + ربط الجهاز + السياسات + الرواتب + الإشعارات.
-- ============================================================

-- ============================================================
--  (أ) الشيفتات — لكل فرع
-- ============================================================
create table if not exists public.shifts (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references public.restaurants(id) on delete cascade,
  name           text not null,
  start_time     time,
  end_time       time,
  grace_minutes  int not null default 0,
  created_at     timestamptz not null default now()
);
create index if not exists idx_shifts_restaurant on public.shifts(restaurant_id);

alter table public.shifts enable row level security;
drop policy if exists "owner shifts" on public.shifts;
create policy "owner shifts" on public.shifts
  for all using (public.is_owner_of(restaurant_id)) with check (public.is_owner_of(restaurant_id));
drop policy if exists "member read shifts" on public.shifts;
create policy "member read shifts" on public.shifts
  for select using (public.is_member_of(restaurant_id));

-- ============================================================
--  (ب) السياسات (تأخير/أوفرتايم) + قواعدها
-- ============================================================
create table if not exists public.policies (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name          text not null,
  kind          text not null check (kind in ('late','overtime')),
  is_default    boolean not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists idx_policies_restaurant on public.policies(restaurant_id);

create table if not exists public.policy_rules (
  id          uuid primary key default gen_random_uuid(),
  policy_id   uuid not null references public.policies(id) on delete cascade,
  from_value  numeric not null,
  to_value    numeric,
  action      text not null,
  amount      numeric,
  note        text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_policy_rules_policy on public.policy_rules(policy_id);

alter table public.policies enable row level security;
alter table public.policy_rules enable row level security;
drop policy if exists "owner policies" on public.policies;
create policy "owner policies" on public.policies
  for all using (public.is_owner_of(restaurant_id)) with check (public.is_owner_of(restaurant_id));
drop policy if exists "member read policies" on public.policies;
create policy "member read policies" on public.policies
  for select using (public.is_member_of(restaurant_id));
drop policy if exists "owner policy_rules" on public.policy_rules;
create policy "owner policy_rules" on public.policy_rules
  for all using (
    exists (select 1 from public.policies p where p.id = policy_rules.policy_id and public.is_owner_of(p.restaurant_id))
  ) with check (
    exists (select 1 from public.policies p where p.id = policy_rules.policy_id and public.is_owner_of(p.restaurant_id))
  );

-- ============================================================
--  (ج) أعمدة الموظف: شيفت + بصمة وجه + جهاز + راتب + جدول + سياسات
-- ============================================================
alter table public.staff
  add column if not exists shift_id             uuid references public.shifts(id) on delete set null,
  add column if not exists face_descriptor      jsonb,
  add column if not exists device_id            text,
  add column if not exists device_registered_at timestamptz,
  add column if not exists base_salary          numeric not null default 0,
  add column if not exists work_days_per_month  int not null default 26,
  add column if not exists work_weekdays        jsonb not null default '[]'::jsonb,
  add column if not exists absence_compensation boolean not null default false,
  add column if not exists late_policy_id       uuid references public.policies(id) on delete set null,
  add column if not exists overtime_policy_id   uuid references public.policies(id) on delete set null;

-- ============================================================
--  (د) أعمدة إضافية لجدول الحضور
-- ============================================================
alter table public.attendance
  add column if not exists late_minutes      int not null default 0,
  add column if not exists overtime_minutes  int not null default 0,
  add column if not exists check_in_lat      double precision,
  add column if not exists check_in_lng      double precision,
  add column if not exists check_in_accuracy double precision,
  add column if not exists check_out_lat     double precision,
  add column if not exists check_out_lng     double precision,
  add column if not exists within_geofence   boolean,
  add column if not exists selfie_url        text,
  add column if not exists face_match_score  numeric,
  add column if not exists status            text,
  add column if not exists method            text;

-- ============================================================
--  (هـ) معاملات الرواتب اليدوية
-- ============================================================
create table if not exists public.payroll_transactions (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  staff_id      uuid not null references public.staff(id) on delete cascade,
  kind          text not null check (kind in ('bonus','allowance','deduction','other')),
  amount        numeric not null,
  ref_date      date not null,
  note          text,
  created_at    timestamptz not null default now()
);
create index if not exists idx_payroll_tx_restaurant on public.payroll_transactions(restaurant_id, ref_date);

alter table public.payroll_transactions enable row level security;
drop policy if exists "owner payroll" on public.payroll_transactions;
create policy "owner payroll" on public.payroll_transactions
  for all using (public.is_owner_of(restaurant_id)) with check (public.is_owner_of(restaurant_id));

-- ============================================================
--  (و) الإشعارات
-- ============================================================
create table if not exists public.notifications (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  title         text not null,
  body          text,
  kind          text,
  is_read       boolean not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists idx_notifications_restaurant on public.notifications(restaurant_id, created_at desc);

alter table public.notifications enable row level security;
drop policy if exists "owner notifications" on public.notifications;
create policy "owner notifications" on public.notifications
  for all using (public.is_owner_of(restaurant_id)) with check (public.is_owner_of(restaurant_id));
drop policy if exists "member insert notifications" on public.notifications;
create policy "member insert notifications" on public.notifications
  for insert with check (public.is_member_of(restaurant_id));

-- تحديث لحظي للإشعارات (تجاهل الخطأ لو مضافة مسبقاً)
do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null; when others then null; end $$;

-- ============================================================
--  (ز) رموز أجهزة الإشعارات (FCM) — لإرسال Push للمالك
-- ============================================================
create table if not exists public.push_tokens (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  restaurant_id uuid references public.restaurants(id) on delete set null,
  token         text not null unique,
  platform      text default 'web',
  updated_at    timestamptz not null default now()
);
create index if not exists idx_push_tokens_user on public.push_tokens(user_id);

alter table public.push_tokens enable row level security;
-- كل مستخدم يدير رمز جهازه فقط (الإرسال من السيرفر بمفتاح الخدمة يتجاوز RLS)
drop policy if exists "own push tokens" on public.push_tokens;
create policy "own push tokens" on public.push_tokens
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================
--  ملاحظات:
--  • النطاق الجغرافي (إحداثيات الفرع + نصف القطر) وتفعيل الصورة/بصمة الوجه
--    تُخزَّن داخل restaurants.settings (jsonb): settings.geofence / attendance_selfie / attendance_face
--    — لا حاجة لتعديل السكيمة لها.
--  • بصمة الوجه: تُخزَّن أرقام البصمة فقط (128 رقم) وليست صورة. المطابقة على السيرفر.
--  • الإشعار عبر Push الأصلي (FCM) يحتاج مفاتيح خارجية؛ هنا الإشعارات داخل التطبيق.
-- ============================================================
