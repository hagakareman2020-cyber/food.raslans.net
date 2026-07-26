-- ============================================================
--  نظام الحضور والانصراف لموظفي المطاعم/الكافيهات — لكل فرع
--  شغّل هذا الملف مرة واحدة في: Supabase Dashboard > SQL Editor
-- ============================================================

create table if not exists public.attendance (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references public.restaurants(id) on delete cascade, -- الفرع
  user_id        uuid not null references auth.users(id) on delete cascade,
  user_name      text,                    -- نسخة ثابتة لاسم الموظف (لعرض التقرير)
  work_date      date not null,           -- يوم العمل (بتوقيت القاهرة)
  check_in_at    timestamptz,             -- وقت الحضور
  check_out_at   timestamptz,             -- وقت الانصراف
  worked_minutes int not null default 0,  -- دقائق العمل المحسوبة عند الانصراف
  note           text,
  created_at     timestamptz not null default now(),
  unique (restaurant_id, user_id, work_date)  -- سجل واحد لكل موظف في اليوم
);
create index if not exists idx_attendance_restaurant_date
  on public.attendance(restaurant_id, work_date desc);

alter table public.attendance enable row level security;

-- المالك يرى ويدير كل سجلات حضور فرعه
create policy "owner attendance" on public.attendance
  for all using (public.is_owner_of(restaurant_id))
  with check (public.is_owner_of(restaurant_id));

-- كل موظف يسجّل ويقرأ حضوره هو فقط داخل الفرع الذي يعمل به
create policy "member own attendance select" on public.attendance
  for select using (user_id = auth.uid() and public.is_member_of(restaurant_id));
create policy "member own attendance insert" on public.attendance
  for insert with check (user_id = auth.uid() and public.is_member_of(restaurant_id));
create policy "member own attendance update" on public.attendance
  for update using (user_id = auth.uid() and public.is_member_of(restaurant_id))
  with check (user_id = auth.uid() and public.is_member_of(restaurant_id));

-- تحديث لحظي (اختياري) للوحة المالك
alter publication supabase_realtime add table public.attendance;
