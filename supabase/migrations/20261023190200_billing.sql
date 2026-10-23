-- StayNest: plans, subscriptions, payments, featured placements, business settings.
-- Prices and limits live here and are edited by admins; the app never hardcodes them.

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9_]+$'),
  name text not null check (char_length(name) between 2 and 60),
  description text not null default '',
  price_amount numeric(12, 2) not null default 0 check (price_amount >= 0),
  currency text not null default 'GHS' check (currency ~ '^[A-Z]{3}$'),
  billing_interval text not null default 'month' check (billing_interval in ('month', 'year')),
  listing_limit int check (listing_limit is null or listing_limit >= 0),
  featured_slots int not null default 0 check (featured_slots >= 0),
  photo_limit int not null default 10 check (photo_limit between 1 and 60),
  features text[] not null default '{}',
  is_active boolean not null default true,
  is_default boolean not null default false,
  sort_order int not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

create unique index plans_one_default on public.plans (is_default) where is_default;
create trigger plans_touch before update on public.plans
  for each row execute function public.touch_updated_at();

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  plan_id uuid not null references public.plans (id) on delete restrict,
  status text not null default 'pending' check (status in ('pending', 'active', 'cancelled', 'expired')),
  -- Snapshot of what was charged, so later plan price changes keep history intact.
  price_amount numeric(12, 2) not null,
  currency text not null,
  plan_name text not null,
  listing_limit int,
  featured_slots int not null default 0,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);

create index subscriptions_owner_idx on public.subscriptions (owner_id, created_at desc);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete restrict,
  purpose text not null check (purpose in ('subscription', 'featured_placement')),
  reference text not null unique,
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null,
  status text not null default 'pending' check (status in ('pending', 'success', 'failed', 'abandoned')),
  provider text not null default 'paystack',
  plan_id uuid references public.plans (id) on delete set null,
  subscription_id uuid references public.subscriptions (id) on delete set null,
  hostel_id uuid references public.hostels (id) on delete set null,
  provider_payload jsonb,
  created_at timestamptz not null default now(),
  verified_at timestamptz
);

create index payments_owner_idx on public.payments (owner_id, created_at desc);

create table public.featured_placements (
  id uuid primary key default gen_random_uuid(),
  hostel_id uuid not null references public.hostels (id) on delete cascade,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  source text not null default 'admin' check (source in ('admin', 'subscription', 'paid')),
  payment_id uuid references public.payments (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint featured_dates check (ends_at > starts_at)
);

create index featured_active_idx on public.featured_placements (ends_at, starts_at);

-- Key/value business settings (fees, promotions, notification toggles, defaults).
create table public.business_settings (
  key text primary key check (key ~ '^[a-z0-9_.]+$'),
  value jsonb not null,
  label text not null,
  description text not null default '',
  is_public boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

create trigger business_settings_touch before update on public.business_settings
  for each row execute function public.touch_updated_at();

-- The listing limit that applies to an owner right now.
create or replace function public.owner_listing_limit(p_owner uuid)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select s.listing_limit from public.subscriptions s
      where s.owner_id = p_owner and s.status = 'active'
        and (s.current_period_end is null or s.current_period_end > now())
      order by s.created_at desc limit 1),
    (select p.listing_limit from public.plans p where p.is_default and p.is_active limit 1),
    1
  )
$$;

-- An active subscription with listing_limit null means unlimited, which the
-- coalesce above cannot distinguish from "no subscription". Handle it here.
create or replace function public.owner_has_unlimited_listings(p_owner uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.subscriptions s
    where s.owner_id = p_owner and s.status = 'active' and s.listing_limit is null
      and (s.current_period_end is null or s.current_period_end > now())
  )
$$;

create or replace function public.enforce_listing_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  used int;
  allowed int;
begin
  if public.is_admin() or public.is_privileged_connection() or new.owner_id is null then
    return new;
  end if;
  if public.owner_has_unlimited_listings(new.owner_id) then
    return new;
  end if;
  select count(*) into used from public.hostels h
   where h.owner_id = new.owner_id and h.status <> 'rejected';
  allowed := public.owner_listing_limit(new.owner_id);
  if used >= allowed then
    raise exception 'Your plan allows % listing(s). Upgrade to add more.', allowed using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger hostels_listing_limit before insert on public.hostels
  for each row execute function public.enforce_listing_limit();

-- Admin changes to plans and settings are audited.
create or replace function public.audit_admin_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.write_audit(
    lower(tg_table_name) || '.' || lower(tg_op), tg_table_name,
    coalesce((case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end) ->> (case when tg_table_name = 'business_settings' then 'key' else 'id' end), ''),
    jsonb_build_object('before', case when tg_op = 'INSERT' then null else to_jsonb(old) end,
                       'after', case when tg_op = 'DELETE' then null else to_jsonb(new) end)
  );
  return coalesce(new, old);
end;
$$;

create trigger plans_audit after insert or update or delete on public.plans
  for each row execute function public.audit_admin_change();
create trigger business_settings_audit after insert or update or delete on public.business_settings
  for each row execute function public.audit_admin_change();
create trigger featured_audit after insert or update or delete on public.featured_placements
  for each row execute function public.audit_admin_change();

alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.featured_placements enable row level security;
alter table public.business_settings enable row level security;

create policy "plans: public read active" on public.plans for select using (is_active);
create policy "plans: admin all" on public.plans for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "subscriptions: owner read own" on public.subscriptions for select to authenticated
  using (owner_id = auth.uid());
create policy "subscriptions: admin read" on public.subscriptions for select to authenticated
  using (public.is_admin());

create policy "payments: owner read own" on public.payments for select to authenticated
  using (owner_id = auth.uid());
create policy "payments: admin read" on public.payments for select to authenticated
  using (public.is_admin());
-- Subscriptions and payments are written only by the server (service role)
-- after Paystack verification. No insert/update policies for clients.

create policy "featured: public read" on public.featured_placements for select using (true);
create policy "featured: admin all" on public.featured_placements for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "settings: public read public keys" on public.business_settings for select
  using (is_public);
create policy "settings: admin all" on public.business_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
