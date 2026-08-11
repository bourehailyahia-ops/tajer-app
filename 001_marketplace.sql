-- ═══════════════════════════════════════════════════════════════
--  تاجر — سوق المنتجات الرقمية
--  المرحلة 1: بائعون · صفحات · منتجات · طلبات · إحالة · تحويلات
--  Postgres / Supabase
-- ═══════════════════════════════════════════════════════════════
--  ملاحظات تصميمية مهمة:
--  1) كل مبالغ الطلب تُجمَّد وقت الشراء (snapshot). تغيير نسبة
--     العمولة لاحقاً لا يعيد كتابة الطلبات القديمة.
--  2) عمولة الإحالة تُخصم من حصة المنصّة، لا تُضاف فوقها.
--  3) لا توجد أي سياسة UPDATE على الأموال — الأرصدة تُحسب من
--     الطلبات، والتعديل حصراً عبر Edge Functions بمفتاح الخدمة.
-- ═══════════════════════════════════════════════════════════════

begin;

create extension if not exists "pgcrypto";

-- ───────────────────────────────────────────────
--  دوال مساعدة
-- ───────────────────────────────────────────────

-- التحقق من الإدارة من قاعدة البيانات، لا من الواجهة
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

-- توليد slug عربي/لاتيني آمن للروابط
create or replace function public.make_slug(txt text)
returns text
language sql
immutable
as $$
  select trim(both '-' from
    regexp_replace(
      regexp_replace(lower(coalesce(txt, '')), '[^a-z0-9\u0621-\u064a]+', '-', 'g'),
      '-{2,}', '-', 'g'
    )
  );
$$;

-- ───────────────────────────────────────────────
--  1) البائعون
-- ───────────────────────────────────────────────

create table if not exists public.sellers (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null unique references auth.users(id) on delete cascade,

  -- صفحة البائع: tajer-app.vercel.app/s/<slug>
  slug              text not null unique
                    check (slug ~ '^[a-z0-9\u0621-\u064a][a-z0-9\u0621-\u064a-]{2,39}$'),
  display_name      text not null check (char_length(display_name) between 2 and 60),
  bio               text check (char_length(bio) <= 600),
  avatar_url        text,
  cover_url         text,

  -- روابط تواصل يعرضها البائع على صفحته
  whatsapp          text,
  facebook_url      text,
  instagram_url     text,

  -- pending → المراجعة الإدارية إلزامية قبل النشر
  status            text not null default 'pending'
                    check (status in ('pending', 'approved', 'suspended', 'rejected')),
  reject_reason     text,

  -- نسبة المنصّة. الافتراضي 30% ويمكن خفضها لبائع مميّز
  commission_rate   numeric(5,4) not null default 0.30
                    check (commission_rate >= 0 and commission_rate <= 0.50),

  -- بيانات التحويل (Chargily لا يقسّم تلقائياً — التحويل يدوي)
  payout_method     text check (payout_method in ('ccp', 'baridimob', 'rib', 'usdt')),
  payout_details    text,
  payout_name       text,

  -- كود الإحالة الخاص بالبائع، يُستعمل في لافتة صفحته
  ref_code          text not null unique,

  total_sales_count integer not null default 0,
  total_gross_dzd   numeric(12,2) not null default 0,

  created_at        timestamptz not null default now(),
  approved_at       timestamptz,
  updated_at        timestamptz not null default now()
);

create index if not exists sellers_status_idx   on public.sellers(status);
create index if not exists sellers_slug_idx     on public.sellers(slug);
create index if not exists sellers_ref_code_idx on public.sellers(ref_code);

-- ───────────────────────────────────────────────
--  2) المنتجات
--  ملاحظة: أعمدة العرض مطابقة لما تستهلكه loadShop()
--  في app.js حتى لا تتغيّر الواجهة الحالية.
-- ───────────────────────────────────────────────

create table if not exists public.digital_products (
  id             uuid primary key default gen_random_uuid(),
  seller_id      uuid references public.sellers(id) on delete cascade,

  slug           text not null,
  title          text not null check (char_length(title) between 3 and 120),
  subtitle       text check (char_length(subtitle) <= 160),
  description    text check (char_length(description) <= 4000),
  contents       text,
  icon           text default '📘',

  price_dzd      numeric(10,2) not null check (price_dzd >= 0),
  price_usd      numeric(10,2) check (price_usd >= 0),

  file_format    text,
  file_size      text,
  pages          text,

  -- الملف نفسه في Storage خاص. لا يُسلَّم إلا برابط موقّع بعد الدفع.
  file_path      text,
  preview_url    text,

  status         text not null default 'draft'
                 check (status in ('draft', 'pending', 'approved', 'rejected', 'hidden')),
  reject_reason  text,

  sales_count    integer not null default 0,
  views_count    integer not null default 0,

  created_at     timestamptz not null default now(),
  published_at   timestamptz,
  updated_at     timestamptz not null default now(),

  unique (seller_id, slug)
);

create index if not exists dp_seller_idx  on public.digital_products(seller_id);
create index if not exists dp_status_idx  on public.digital_products(status)
  where status = 'approved';

-- بحث نصي عربي على المنتجات المنشورة
create index if not exists dp_search_idx on public.digital_products
  using gin (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(subtitle,'') || ' ' || coalesce(description,'')));

-- ───────────────────────────────────────────────
--  3) الطلبات — المبالغ مجمّدة وقت الشراء
-- ───────────────────────────────────────────────

create table if not exists public.orders (
  id                 uuid primary key default gen_random_uuid(),
  order_no           bigint generated always as identity,

  buyer_id           uuid references auth.users(id) on delete set null,
  buyer_email        text not null,
  product_id         uuid not null references public.digital_products(id) on delete restrict,
  seller_id          uuid not null references public.sellers(id) on delete restrict,

  -- لقطة ثابتة: لو حُذف المنتج أو تغيّر سعره تبقى الطلبات صحيحة
  product_title      text not null,
  currency           text not null default 'DZD' check (currency in ('DZD', 'USD')),
  gross_amount       numeric(10,2) not null check (gross_amount >= 0),
  commission_rate    numeric(5,4)  not null,
  platform_amount    numeric(10,2) not null,
  seller_amount      numeric(10,2) not null,

  -- الإحالة تُخصم من حصة المنصّة، لا تُضاف فوقها
  referrer_seller_id uuid references public.sellers(id) on delete set null,
  referral_rate      numeric(5,4)  not null default 0,
  referral_amount    numeric(10,2) not null default 0,

  status             text not null default 'pending'
                     check (status in ('pending', 'paid', 'failed', 'refunded', 'chargeback')),
  payment_provider   text check (payment_provider in ('chargily', 'nowpayments', 'play', 'manual')),
  payment_ref        text unique,

  -- تسليم الملف
  download_token     text unique default encode(gen_random_bytes(24), 'hex'),
  download_count     integer not null default 0,
  download_expires_at timestamptz,

  -- فترة تجميد قبل استحقاق التحويل (حماية من الاسترجاع والاحتيال)
  payout_eligible_at timestamptz,
  payout_id          uuid,

  created_at         timestamptz not null default now(),
  paid_at            timestamptz,

  -- تحقّق حسابي: المجموع لا يتجاوز الإجمالي أبداً
  constraint amounts_balance
    check (round(seller_amount + platform_amount + referral_amount, 2) <= round(gross_amount, 2) + 0.01),
  constraint referral_within_platform
    check (referral_amount <= platform_amount + referral_amount)
);

create index if not exists orders_seller_idx   on public.orders(seller_id, status);
create index if not exists orders_buyer_idx    on public.orders(buyer_id);
create index if not exists orders_referrer_idx on public.orders(referrer_seller_id)
  where referrer_seller_id is not null;
create index if not exists orders_payout_idx   on public.orders(seller_id)
  where status = 'paid' and payout_id is null;

-- ───────────────────────────────────────────────
--  4) الإحالة — نقرة اللافتة ثم التسجيل
--  اللافتة في صفحة البائع تحمل ?ref=<ref_code>
-- ───────────────────────────────────────────────

create table if not exists public.referral_clicks (
  id          bigint generated always as identity primary key,
  ref_code    text not null,
  seller_id   uuid references public.sellers(id) on delete cascade,
  source      text,                 -- 'badge' | 'link' | 'share'
  landing     text,
  ip_hash     text,                 -- تجزئة فقط، لا نخزّن IP خاماً
  ua_hash     text,
  created_at  timestamptz not null default now()
);

create index if not exists rc_seller_idx on public.referral_clicks(seller_id, created_at desc);

create table if not exists public.referrals (
  id                bigint generated always as identity primary key,
  referrer_seller_id uuid not null references public.sellers(id) on delete cascade,
  referred_user_id   uuid not null unique references auth.users(id) on delete cascade,
  ref_code           text not null,
  source             text,

  -- الإسناد ينتهي بعد 30 يوماً من التسجيل
  attribution_ends_at timestamptz not null default (now() + interval '30 days'),

  -- إشارات كشف الاحتيال (تُملأ من Edge Function)
  signup_ip_hash     text,
  signup_device_hash text,
  flagged            boolean not null default false,
  flag_reason        text,

  created_at         timestamptz not null default now(),

  -- منع الإحالة الذاتية على مستوى قاعدة البيانات
  constraint no_self_referral_row check (referrer_seller_id is not null)
);

create index if not exists ref_referrer_idx on public.referrals(referrer_seller_id);

-- ───────────────────────────────────────────────
--  5) التحويلات للبائعين (يدوية عبر CCP/BaridiMob)
-- ───────────────────────────────────────────────

create table if not exists public.payouts (
  id            uuid primary key default gen_random_uuid(),
  payout_no     bigint generated always as identity,
  seller_id     uuid not null references public.sellers(id) on delete restrict,

  amount_dzd    numeric(12,2) not null check (amount_dzd > 0),
  orders_count  integer not null default 0,

  method        text not null check (method in ('ccp', 'baridimob', 'rib', 'usdt')),
  details       text,
  reference     text,               -- رقم الحوالة
  receipt_url   text,

  status        text not null default 'pending'
                check (status in ('pending', 'processing', 'sent', 'failed')),
  note          text,

  created_at    timestamptz not null default now(),
  sent_at       timestamptz
);

create index if not exists payouts_seller_idx on public.payouts(seller_id, created_at desc);

alter table public.orders
  drop constraint if exists orders_payout_fk;
alter table public.orders
  add constraint orders_payout_fk
  foreign key (payout_id) references public.payouts(id) on delete set null;

-- ───────────────────────────────────────────────
--  6) محفّزات (Triggers)
-- ───────────────────────────────────────────────

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists sellers_touch on public.sellers;
create trigger sellers_touch before update on public.sellers
  for each row execute function public.touch_updated_at();

drop trigger if exists dp_touch on public.digital_products;
create trigger dp_touch before update on public.digital_products
  for each row execute function public.touch_updated_at();

-- عند تأكيد الدفع: حدّث العدادات واضبط موعد استحقاق التحويل
create or replace function public.on_order_paid()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'paid' and coalesce(old.status, '') <> 'paid' then
    new.paid_at := coalesce(new.paid_at, now());
    -- 14 يوماً تجميد قبل استحقاق التحويل
    new.payout_eligible_at := coalesce(new.payout_eligible_at, now() + interval '14 days');
    new.download_expires_at := coalesce(new.download_expires_at, now() + interval '30 days');

    update public.digital_products
       set sales_count = sales_count + 1
     where id = new.product_id;

    update public.sellers
       set total_sales_count = total_sales_count + 1,
           total_gross_dzd   = total_gross_dzd + new.gross_amount
     where id = new.seller_id;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_paid on public.orders;
create trigger orders_paid before update on public.orders
  for each row execute function public.on_order_paid();

-- منع الإحالة الذاتية: البائع لا يُحيل نفسه
create or replace function public.block_self_referral()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  ref_user uuid;
begin
  select user_id into ref_user from public.sellers where id = new.referrer_seller_id;
  if ref_user = new.referred_user_id then
    raise exception 'self referral is not allowed';
  end if;
  return new;
end;
$$;

drop trigger if exists referrals_no_self on public.referrals;
create trigger referrals_no_self before insert on public.referrals
  for each row execute function public.block_self_referral();

-- حماية الأعمدة الحسّاسة عبر محفّز بدل استعلام داخل السياسة
-- (الاستعلام داخل السياسة يسبّب infinite recursion لأنه يستدعي السياسة نفسها)
create or replace function public.guard_seller_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() فارغ يعني استدعاء من الخادم (service_role) أو من محفّز
  -- داخلي مثل تحديث عدّاد المبيعات — الحراسة تخصّ المستخدم النهائي فقط.
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  if new.status          is distinct from old.status
  or new.commission_rate is distinct from old.commission_rate
  or new.ref_code        is distinct from old.ref_code
  or new.slug            is distinct from old.slug
  or new.user_id         is distinct from old.user_id
  or new.total_sales_count is distinct from old.total_sales_count
  or new.total_gross_dzd   is distinct from old.total_gross_dzd
  or new.approved_at       is distinct from old.approved_at then
    raise exception 'field is not editable by seller';
  end if;
  return new;
end;
$$;

drop trigger if exists sellers_guard on public.sellers;
create trigger sellers_guard before update on public.sellers
  for each row execute function public.guard_seller_columns();

create or replace function public.guard_product_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  -- البائع لا يوافق على منتجه بنفسه: المراجعة الإدارية إلزامية
  if new.status is distinct from old.status
     and new.status not in ('draft', 'pending', 'hidden') then
    raise exception 'seller cannot approve own product';
  end if;
  -- أي تعديل جوهري يعيد المنتج للمراجعة
  if old.status = 'approved'
     and (new.title       is distinct from old.title
       or new.price_dzd   is distinct from old.price_dzd
       or new.file_path   is distinct from old.file_path
       or new.description is distinct from old.description) then
    new.status := 'pending';
  end if;
  if new.sales_count is distinct from old.sales_count
  or new.seller_id   is distinct from old.seller_id then
    raise exception 'field is not editable by seller';
  end if;
  return new;
end;
$$;

drop trigger if exists dp_guard on public.digital_products;
create trigger dp_guard before update on public.digital_products
  for each row execute function public.guard_product_columns();

-- ───────────────────────────────────────────────
--  7) عروض (Views) للوحات التحكّم
-- ───────────────────────────────────────────────

-- رصيد كل بائع: مستحق / مجمّد / مدفوع
-- ملاحظة: أرباح الإحالة تُحسب في استعلام منفصل لأن الطلب يرتبط
-- بالمُحيل عبر referrer_seller_id لا عبر seller_id.
create or replace view public.seller_balances as
select
  s.id  as seller_id,
  s.slug,
  s.display_name,
  coalesce(sales.available_dzd, 0)  as available_dzd,
  coalesce(sales.pending_dzd, 0)    as pending_dzd,
  coalesce(sales.paid_out_dzd, 0)   as paid_out_dzd,
  coalesce(refs.earned_dzd, 0)      as referral_earned_dzd,
  coalesce(refs.pending_dzd, 0)     as referral_pending_dzd
from public.sellers s
left join lateral (
  select
    sum(o.seller_amount) filter (
      where o.status = 'paid' and o.payout_id is null and o.payout_eligible_at <= now()
    ) as available_dzd,
    sum(o.seller_amount) filter (
      where o.status = 'paid' and o.payout_id is null and o.payout_eligible_at > now()
    ) as pending_dzd,
    sum(o.seller_amount) filter (where o.payout_id is not null) as paid_out_dzd
  from public.orders o
  where o.seller_id = s.id
) sales on true
left join lateral (
  select
    sum(o.referral_amount) filter (where o.status = 'paid') as earned_dzd,
    sum(o.referral_amount) filter (
      where o.status = 'paid' and o.payout_eligible_at > now()
    ) as pending_dzd
  from public.orders o
  where o.referrer_seller_id = s.id
) refs on true;

-- ملخّص أرباح المنصّة
create or replace view public.platform_revenue as
select
  date_trunc('month', paid_at) as month,
  count(*)                     as orders_count,
  sum(gross_amount)            as gross_dzd,
  sum(platform_amount)         as platform_dzd,
  sum(referral_amount)         as referral_paid_dzd,
  sum(seller_amount)           as sellers_dzd
from public.orders
where status = 'paid'
group by 1
order by 1 desc;

-- ───────────────────────────────────────────────
--  صفحة البائع العامة: /s/<slug>
--  أعمدة آمنة فقط — لا CCP ولا BaridiMob ولا user_id.
--  هذا العرض هو ما تقرأه الواجهة والزوّار.
--  badge_url = رابط اللافتة "بواسطة تاجر" في أسفل صفحة البائع:
--  كل زائر يدخل منه يُنسب للبائع كإحالة.
-- ───────────────────────────────────────────────
create or replace view public.sellers_public as
select
  s.id,
  s.slug,
  s.display_name,
  s.bio,
  s.avatar_url,
  s.cover_url,
  s.whatsapp,
  s.facebook_url,
  s.instagram_url,
  s.total_sales_count,
  s.created_at,
  'https://tajer-app.vercel.app/s/' || s.slug                        as page_url,
  'https://tajer-app.vercel.app/?ref=' || s.ref_code || '&src=badge' as badge_url
from public.sellers s
where s.status = 'approved';

comment on view public.sellers_public is
  'صفحة البائع العامة — بلا بيانات دفع. badge_url هو رابط لافتة "بواسطة تاجر".';

-- بائع معتمد؟ security definer لتجنّب التكرار اللانهائي في السياسات
create or replace function public.seller_is_approved(sid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.sellers s where s.id = sid and s.status = 'approved');
$$;

-- هل هذا البائع يخصّ المستخدم الحالي؟
create or replace function public.owns_seller(sid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.sellers s where s.id = sid and s.user_id = auth.uid());
$$;

-- ═══════════════════════════════════════════════
--  8) RLS — الأمان
--  القاعدة: القراءة العامة للمنشور فقط.
--  كل كتابة تمسّ المال تمرّ عبر Edge Function
--  بمفتاح service_role (يتجاوز RLS).
-- ═══════════════════════════════════════════════

alter table public.sellers          enable row level security;
alter table public.digital_products enable row level security;
alter table public.orders           enable row level security;
alter table public.referrals        enable row level security;
alter table public.referral_clicks  enable row level security;
alter table public.payouts          enable row level security;

-- ── البائعون ──
-- مهم: لا قراءة عامة للجدول نفسه، لأنه يحوي بيانات CCP/BaridiMob.
-- الواجهة العامة تقرأ من العرض public.sellers_public أدناه فقط.
drop policy if exists sellers_public_read on public.sellers;

drop policy if exists sellers_own_read on public.sellers;
create policy sellers_own_read on public.sellers
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists sellers_own_insert on public.sellers;
create policy sellers_own_insert on public.sellers
  for insert with check (user_id = auth.uid() and status = 'pending');

-- الحقول المحميّة يحرسها محفّز sellers_guard، لا سياسة فرعية
drop policy if exists sellers_own_update on public.sellers;
create policy sellers_own_update on public.sellers
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists sellers_admin_all on public.sellers;
create policy sellers_admin_all on public.sellers
  for all using (public.is_admin()) with check (public.is_admin());

-- ── المنتجات ──
drop policy if exists dp_public_read on public.digital_products;
create policy dp_public_read on public.digital_products
  for select using (
    status = 'approved' and public.seller_is_approved(seller_id)
  );

drop policy if exists dp_owner_read on public.digital_products;
create policy dp_owner_read on public.digital_products
  for select using (public.is_admin() or public.owns_seller(seller_id));

drop policy if exists dp_owner_write on public.digital_products;
create policy dp_owner_write on public.digital_products
  for insert with check (
    public.owns_seller(seller_id)
    and public.seller_is_approved(seller_id)
    and status in ('draft', 'pending')
  );

-- الحقول المحميّة يحرسها محفّز dp_guard
drop policy if exists dp_owner_update on public.digital_products;
create policy dp_owner_update on public.digital_products
  for update using (public.owns_seller(seller_id))
  with check (public.owns_seller(seller_id));

drop policy if exists dp_owner_delete on public.digital_products;
create policy dp_owner_delete on public.digital_products
  for delete using (public.owns_seller(seller_id) and sales_count = 0);

drop policy if exists dp_admin_all on public.digital_products;
create policy dp_admin_all on public.digital_products
  for all using (public.is_admin()) with check (public.is_admin());

-- ── الطلبات: قراءة فقط، ولا كتابة إطلاقاً من المتصفّح ──
drop policy if exists orders_buyer_read on public.orders;
create policy orders_buyer_read on public.orders
  for select using (buyer_id = auth.uid());

drop policy if exists orders_seller_read on public.orders;
create policy orders_seller_read on public.orders
  for select using (
    exists (select 1 from public.sellers s
            where s.id = orders.seller_id and s.user_id = auth.uid())
  );

drop policy if exists orders_admin_all on public.orders;
create policy orders_admin_all on public.orders
  for all using (public.is_admin()) with check (public.is_admin());

-- ── الإحالة ──
drop policy if exists referrals_own_read on public.referrals;
create policy referrals_own_read on public.referrals
  for select using (
    public.is_admin()
    or exists (select 1 from public.sellers s
               where s.id = referrals.referrer_seller_id and s.user_id = auth.uid())
  );

drop policy if exists rc_admin_read on public.referral_clicks;
create policy rc_admin_read on public.referral_clicks
  for select using (
    public.is_admin()
    or exists (select 1 from public.sellers s
               where s.id = referral_clicks.seller_id and s.user_id = auth.uid())
  );

-- ── التحويلات: البائع يقرأ فقط ──
drop policy if exists payouts_own_read on public.payouts;
create policy payouts_own_read on public.payouts
  for select using (
    public.is_admin()
    or exists (select 1 from public.sellers s
               where s.id = payouts.seller_id and s.user_id = auth.uid())
  );

drop policy if exists payouts_admin_all on public.payouts;
create policy payouts_admin_all on public.payouts
  for all using (public.is_admin()) with check (public.is_admin());

commit;

-- ═══════════════════════════════════════════════
--  9) الصلاحيات على العروض العامة
-- ═══════════════════════════════════════════════
-- العروض تعمل بصلاحية مالكها (security definer ضمنياً في PG16)
-- فتتجاوز RLS بأمان لأنها لا تكشف إلا أعمدة آمنة.
grant select on public.sellers_public to anon, authenticated;
grant select on public.seller_balances to authenticated;
revoke all on public.platform_revenue from anon, authenticated;

-- ═══════════════════════════════════════════════
--  10) تحصين جدول profiles الموجود مسبقاً
--  ⚠️ بدون هذا يقدر أي مستخدم يعلن نفسه أدمن
-- ═══════════════════════════════════════════════
alter table public.profiles enable row level security;

drop policy if exists profiles_own_read on public.profiles;
create policy profiles_own_read on public.profiles
  for select using (id = auth.uid() or public.is_admin());

-- لا سياسة UPDATE إطلاقاً: is_admin و pro_until و tier
-- تُعدَّل حصراً من Edge Function بمفتاح service_role.
revoke update on public.profiles from anon, authenticated;

-- ═══════════════════════════════════════════════
--  ملحق: Storage
--  شغّلها من لوحة Supabase → Storage
-- ═══════════════════════════════════════════════
-- 1) أنشئ bucket اسمه product-files و public = false
-- 2) أنشئ bucket اسمه seller-media  و public = true  (الصور والأغلفة)
-- الملف المدفوع لا يُسلَّم أبداً برابط مباشر — فقط رابط موقّع
-- قصير الأجل يُنشئه Edge Function بعد التحقّق من الطلب.
