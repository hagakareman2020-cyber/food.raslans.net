-- ============================================================
--  نظام إدارة المطاعم الذكي — سكيمة قاعدة البيانات (Supabase / Postgres)
--  متعدد المستأجرين (Multi-tenant) بحماية Row Level Security
--  شغّل هذا الملف مرة واحدة في: Supabase Dashboard > SQL Editor
-- ============================================================

-- امتدادات مطلوبة
create extension if not exists "pgcrypto";

-- ============================================================
--  1) الجداول الأساسية
-- ============================================================

-- ملف المستخدم (مرتبط بـ auth.users)
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  phone       text,
  created_at  timestamptz not null default now()
);

-- المطاعم (كل صف = مستأجر)
create table if not exists public.restaurants (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  slug         text unique not null,           -- يُستخدم في الروابط العامة
  logo_url     text,
  currency     text not null default 'EGP',
  -- إعدادات مرنة: عدد زجاجات المياه المجانية، لغات، ...إلخ
  settings     jsonb not null default '{"free_water_bottles": 2, "languages": ["ar","en"]}'::jsonb,
  status       text not null default 'active',  -- active | suspended
  created_at   timestamptz not null default now()
);
create index if not exists idx_restaurants_owner on public.restaurants(owner_id);

-- الموظفون وصلاحياتهم داخل مطعم
create table if not exists public.staff (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  role          text not null check (role in ('accountant','chef','assistant')),
  -- الأقسام المسموح بها: kitchen | accounting
  sections      text[] not null default '{}',
  created_at    timestamptz not null default now(),
  unique (restaurant_id, user_id)
);
create index if not exists idx_staff_restaurant on public.staff(restaurant_id);
create index if not exists idx_staff_user on public.staff(user_id);

-- ============================================================
--  2) المنيو: الأقسام والمنتجات
-- ============================================================

create table if not exists public.categories (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name_ar       text not null,
  name_en       text,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists idx_categories_restaurant on public.categories(restaurant_id);

create table if not exists public.products (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  category_id   uuid references public.categories(id) on delete set null,
  name_ar       text not null,
  name_en       text,
  ingredients   text,                          -- المكونات (وصف)
  price         numeric(10,2) not null default 0,
  image_url     text,
  prep_minutes  int not null default 10,       -- المدة المستغرقة للتنفيذ
  -- وسوم تحذيرية/غذائية: nuts | spicy | vegetarian | vegan | gluten ...
  tags          text[] not null default '{}',
  is_available  boolean not null default true, -- إخفاء يدوي
  in_stock      boolean not null default true, -- يُحدّث آلياً من المخزون
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists idx_products_restaurant on public.products(restaurant_id);
create index if not exists idx_products_category on public.products(category_id);

-- نسخ المنيو المولّدة بالذكاء الاصطناعي (سجل النسخ + النسخة المعتمدة)
create table if not exists public.menu_versions (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  content       jsonb not null,                -- المنيو المقترح كامل
  model         text,                          -- openai/gpt-oss-120b
  is_approved   boolean not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists idx_menu_versions_restaurant on public.menu_versions(restaurant_id);

-- ============================================================
--  3) الترابيزات وأكواد QR
-- ============================================================

create table if not exists public.restaurant_tables (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  table_number  int not null,
  qr_token      text not null default encode(gen_random_bytes(12),'hex'), -- توكن سري للرابط
  created_at    timestamptz not null default now(),
  unique (restaurant_id, table_number)
);
create index if not exists idx_tables_restaurant on public.restaurant_tables(restaurant_id);
create index if not exists idx_tables_token on public.restaurant_tables(qr_token);

-- ============================================================
--  4) الطلبات
-- ============================================================

create table if not exists public.orders (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  table_id      uuid references public.restaurant_tables(id) on delete set null,
  table_number  int,                           -- مرتبط برقم الترابيزة (نسخة ثابتة)
  status        text not null default 'received'
                check (status in ('received','preparing','ready','served','cancelled')),
  total         numeric(10,2) not null default 0,
  eta_minutes   int,                           -- الوقت المتوقع (أطول منتج)
  session_id    text,                          -- جلسة العميل (لتتبع الطلب)
  note          text,
  created_at    timestamptz not null default now(),
  ready_at      timestamptz,
  served_at     timestamptz
);
create index if not exists idx_orders_restaurant on public.orders(restaurant_id, created_at desc);
create index if not exists idx_orders_status on public.orders(restaurant_id, status);

create table if not exists public.order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  product_id  uuid references public.products(id) on delete set null,
  name_ar     text not null,                   -- نسخة ثابتة وقت الطلب
  price       numeric(10,2) not null,
  quantity    int not null default 1,
  note        text,
  is_free     boolean not null default false   -- زجاجات المياه المجانية
);
create index if not exists idx_order_items_order on public.order_items(order_id);

-- تقييم الأطباق (لتغذية التحليلات)
create table if not exists public.order_ratings (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  product_id  uuid references public.products(id) on delete set null,
  rating      int not null check (rating between 1 and 5),
  comment     text,
  created_at  timestamptz not null default now()
);

-- ============================================================
--  5) نداء الجرسون
-- ============================================================

create table if not exists public.waiter_calls (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  table_id      uuid references public.restaurant_tables(id) on delete set null,
  table_number  int,
  status        text not null default 'pending' check (status in ('pending','done')),
  created_at    timestamptz not null default now()
);
create index if not exists idx_waiter_calls_restaurant on public.waiter_calls(restaurant_id, status);

-- ============================================================
--  6) المخزون
-- ============================================================

create table if not exists public.inventory_items (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name          text not null,
  quantity      numeric(12,2) not null default 0,
  unit          text not null default 'unit',  -- كجم | لتر | قطعة ...
  low_threshold numeric(12,2) not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists idx_inventory_restaurant on public.inventory_items(restaurant_id);

-- ربط المنتج بمكوناته من المخزون (لإخفاء الطبق آلياً عند النفاد)
create table if not exists public.product_ingredients (
  product_id        uuid not null references public.products(id) on delete cascade,
  inventory_item_id uuid not null references public.inventory_items(id) on delete cascade,
  amount            numeric(12,2) not null default 0,
  primary key (product_id, inventory_item_id)
);

-- ============================================================
--  7) الورديات (تقرير إغلاق Z-Report)
-- ============================================================

create table if not exists public.shifts (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  opened_by     uuid references auth.users(id) on delete set null,
  opened_at     timestamptz not null default now(),
  closed_at     timestamptz,
  total_sales   numeric(12,2) not null default 0,
  total_orders  int not null default 0,
  note          text
);
create index if not exists idx_shifts_restaurant on public.shifts(restaurant_id, opened_at desc);

-- ============================================================
--  8) دوال مساعدة للصلاحيات
-- ============================================================

-- هل المستخدم الحالي يملك أو يعمل في هذا المطعم؟
create or replace function public.is_member_of(rid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from restaurants r where r.id = rid and r.owner_id = auth.uid()
  ) or exists (
    select 1 from staff s where s.restaurant_id = rid and s.user_id = auth.uid()
  );
$$;

-- هل المستخدم مالك المطعم؟
create or replace function public.is_owner_of(rid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from restaurants r where r.id = rid and r.owner_id = auth.uid()
  );
$$;

-- ============================================================
--  9) تفعيل RLS + السياسات
-- ============================================================

alter table public.profiles            enable row level security;
alter table public.restaurants          enable row level security;
alter table public.staff                enable row level security;
alter table public.categories           enable row level security;
alter table public.products             enable row level security;
alter table public.menu_versions        enable row level security;
alter table public.restaurant_tables    enable row level security;
alter table public.orders               enable row level security;
alter table public.order_items          enable row level security;
alter table public.order_ratings        enable row level security;
alter table public.waiter_calls         enable row level security;
alter table public.inventory_items      enable row level security;
alter table public.product_ingredients  enable row level security;
alter table public.shifts               enable row level security;

-- profiles: كل شخص يرى/يعدّل ملفه فقط
create policy "own profile" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

-- restaurants: الأعضاء يقرؤون، المالك يعدّل
create policy "members read restaurants" on public.restaurants
  for select using (public.is_member_of(id));
create policy "owner insert restaurants" on public.restaurants
  for insert with check (owner_id = auth.uid());
create policy "owner update restaurants" on public.restaurants
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner delete restaurants" on public.restaurants
  for delete using (owner_id = auth.uid());

-- staff: الأعضاء يقرؤون، المالك يدير
create policy "members read staff" on public.staff
  for select using (public.is_member_of(restaurant_id));
create policy "owner manage staff" on public.staff
  for all using (public.is_owner_of(restaurant_id))
  with check (public.is_owner_of(restaurant_id));

-- دالة عامة تطبّق نمط: قراءة عامة للمنيو + كتابة للأعضاء
-- categories
create policy "public read categories" on public.categories for select using (true);
create policy "members write categories" on public.categories
  for all using (public.is_member_of(restaurant_id))
  with check (public.is_member_of(restaurant_id));

-- products
create policy "public read products" on public.products for select using (true);
create policy "members write products" on public.products
  for all using (public.is_member_of(restaurant_id))
  with check (public.is_member_of(restaurant_id));

-- menu_versions: للأعضاء فقط
create policy "members menu_versions" on public.menu_versions
  for all using (public.is_member_of(restaurant_id))
  with check (public.is_member_of(restaurant_id));

-- restaurant_tables: قراءة عامة (للتحقق من التوكن), كتابة للأعضاء
create policy "public read tables" on public.restaurant_tables for select using (true);
create policy "members write tables" on public.restaurant_tables
  for all using (public.is_member_of(restaurant_id))
  with check (public.is_member_of(restaurant_id));

-- orders / order_items / waiter_calls:
--   القراءة/الكتابة للأعضاء فقط عبر الـ client.
--   طلبات العملاء (مجهولين) تمر عبر API routes بمفتاح service_role على السيرفر.
create policy "members orders" on public.orders
  for all using (public.is_member_of(restaurant_id))
  with check (public.is_member_of(restaurant_id));

create policy "members order_items" on public.order_items
  for all using (exists (
    select 1 from public.orders o
    where o.id = order_id and public.is_member_of(o.restaurant_id)
  ))
  with check (exists (
    select 1 from public.orders o
    where o.id = order_id and public.is_member_of(o.restaurant_id)
  ));

create policy "members ratings" on public.order_ratings
  for all using (exists (
    select 1 from public.orders o
    where o.id = order_id and public.is_member_of(o.restaurant_id)
  ))
  with check (true);

create policy "members waiter_calls" on public.waiter_calls
  for all using (public.is_member_of(restaurant_id))
  with check (public.is_member_of(restaurant_id));

-- inventory / product_ingredients / shifts: للأعضاء فقط
create policy "members inventory" on public.inventory_items
  for all using (public.is_member_of(restaurant_id))
  with check (public.is_member_of(restaurant_id));

create policy "members product_ingredients" on public.product_ingredients
  for all using (exists (
    select 1 from public.products p
    where p.id = product_id and public.is_member_of(p.restaurant_id)
  ))
  with check (exists (
    select 1 from public.products p
    where p.id = product_id and public.is_member_of(p.restaurant_id)
  ));

create policy "members shifts" on public.shifts
  for all using (public.is_member_of(restaurant_id))
  with check (public.is_member_of(restaurant_id));

-- ============================================================
--  10) تفعيل Realtime على جداول المطبخ والنداء
-- ============================================================
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.order_items;
alter publication supabase_realtime add table public.waiter_calls;

-- ============================================================
--  انتهى. بعد التشغيل: أنشئ Storage bucket عام باسم "public-assets"
--  لتخزين اللوجوهات وصور المنتجات.
-- ============================================================
