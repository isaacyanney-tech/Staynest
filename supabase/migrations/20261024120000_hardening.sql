-- StayNest: rate limits, write throttles, one checkout per purchase, and
-- indexes for the queries the dashboards and admin console run.

-- ---------------------------------------------------------------------------
-- Rate limits
--
-- Fixed-window counters keyed by a short string such as "signin:ip:1.2.3.4"
-- or "w:inspection_requests:<user id>". The server calls take_rate_limit()
-- with the service role for sign-in, sign-up and password resets (keyed by
-- the visitor's IP address, since every request reaches Supabase from the
-- same Netlify servers). Triggers below call it for signed-in writes, so the
-- limits also hold for anyone calling the API directly with their own token.
-- ---------------------------------------------------------------------------

create table public.rate_limits (
  key text not null check (char_length(key) <= 200),
  window_start timestamptz not null,
  hits int not null default 0,
  primary key (key, window_start)
);
alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from public, anon, authenticated;

-- With p_cost 1 (the default), records a hit and returns true if it is
-- within p_max for the current window. With p_cost 0, records nothing and
-- returns true if one more hit would be allowed; used to count only failed
-- sign-ins while still refusing attempts once the limit is reached.
create or replace function public.take_rate_limit(p_key text, p_max int, p_window_seconds int, p_cost int default 1)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  bucket timestamptz;
  n int;
begin
  if p_key is null or p_max < 1 or p_window_seconds < 1 or p_cost not in (0, 1) then
    raise exception 'Invalid rate limit' using errcode = '22023';
  end if;
  bucket := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  if p_cost = 0 then
    select r.hits into n from public.rate_limits r where r.key = left(p_key, 200) and r.window_start = bucket;
    return coalesce(n, 0) < p_max;
  end if;
  insert into public.rate_limits as r (key, window_start, hits)
  values (left(p_key, 200), bucket, 1)
  on conflict (key, window_start) do update set hits = r.hits + 1
  returning r.hits into n;
  -- Drop finished windows now and then, so the table stays small.
  if random() < 0.02 then
    delete from public.rate_limits where window_start < now() - interval '2 days';
  end if;
  return n <= p_max;
end;
$$;

revoke all on function public.take_rate_limit(text, int, int, int) from public, anon, authenticated;
grant execute on function public.take_rate_limit(text, int, int, int) to service_role;

-- Before-insert (or update) trigger: limits how often one account can write
-- to a table. Arguments: max writes, window in seconds. Administrators and
-- server-side jobs are not limited.
create or replace function public.throttle_writes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if me is null or public.is_admin() or public.is_privileged_connection() then
    return new;
  end if;
  if not public.take_rate_limit('w:' || tg_table_name || ':' || me::text, tg_argv[0]::int, tg_argv[1]::int) then
    raise exception 'You are doing that too often. Wait a few minutes and try again.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke all on function public.throttle_writes() from public, anon, authenticated;

create trigger inspection_requests_throttle before insert on public.inspection_requests
  for each row execute function public.throttle_writes('10', '3600');
create trigger hostel_ratings_throttle before insert or update on public.hostel_ratings
  for each row execute function public.throttle_writes('20', '3600');
create trigger hostels_throttle before insert on public.hostels
  for each row execute function public.throttle_writes('10', '86400');
create trigger room_types_throttle before insert on public.room_types
  for each row execute function public.throttle_writes('60', '3600');
create trigger hostel_media_throttle before insert on public.hostel_media
  for each row execute function public.throttle_writes('120', '3600');
create trigger saved_hostels_throttle before insert on public.saved_hostels
  for each row execute function public.throttle_writes('200', '3600');
create trigger verification_applications_throttle before insert on public.verification_applications
  for each row execute function public.throttle_writes('5', '86400');
create trigger verification_documents_throttle before insert on public.verification_documents
  for each row execute function public.throttle_writes('40', '86400');

-- ---------------------------------------------------------------------------
-- One checkout per purchase
--
-- A double click, a second tab or a retry used to open a second Paystack
-- checkout for the same thing, which an owner could pay twice. start_payment
-- now hands back the unfinished payment from the last 30 minutes for the same
-- purchase, and the server sends the owner back to the checkout page it
-- already opened. An advisory lock per owner makes simultaneous requests
-- queue instead of each creating a payment.
-- ---------------------------------------------------------------------------

alter table public.payments add column checkout_url text check (checkout_url is null or char_length(checkout_url) <= 500);

create index payments_open_checkout_idx on public.payments (owner_id, purpose, created_at desc) where status = 'pending';

create or replace function public.start_payment(
  p_purpose text, p_plan_code text default null, p_hostel uuid default null, p_weeks int default null
)
returns table (reference text, amount numeric, currency text, description text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  plan record;
  hostel record;
  week_price numeric;
  open_ref text;
  ref text := 'sn_' || replace(gen_random_uuid()::text, '-', '');
begin
  if me is null or not public.is_owner() then
    raise exception 'Only hostel owners can make payments' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('start_payment:' || me::text, 0));

  if p_purpose = 'subscription' then
    select * into plan from public.plans p where p.code = p_plan_code and p.is_active;
    if plan is null then
      raise exception 'That plan is not available' using errcode = 'P0001';
    end if;
    if plan.price_amount <= 0 then
      raise exception 'That plan is free and needs no payment' using errcode = 'P0001';
    end if;
    select p.reference into open_ref from public.payments p
     where p.owner_id = me and p.status = 'pending' and p.purpose = 'subscription' and p.plan_id = plan.id
       and p.amount = plan.price_amount and p.created_at > now() - interval '30 minutes'
     order by p.created_at desc limit 1;
    if open_ref is null then
      perform public.check_pending_payment_cap(me);
      insert into public.payments (owner_id, purpose, reference, amount, currency, plan_id)
      values (me, 'subscription', ref, plan.price_amount, plan.currency, plan.id);
      open_ref := ref;
    end if;
    return query select open_ref, plan.price_amount, plan.currency,
      format('%s plan, one %s', plan.name, plan.billing_interval);

  elsif p_purpose = 'featured_placement' then
    if p_weeks is null or p_weeks not between 1 and 12 then
      raise exception 'Choose between 1 and 12 weeks' using errcode = 'P0001';
    end if;
    select h.id, h.name, h.status into hostel from public.hostels h
     where h.id = p_hostel and h.owner_id = me;
    if hostel is null then
      raise exception 'You can only feature your own hostels' using errcode = '42501';
    end if;
    if hostel.status <> 'published' then
      raise exception 'Only published listings can be featured' using errcode = 'P0001';
    end if;
    select (value #>> '{}')::numeric into week_price from public.business_settings where key = 'featured.price_per_week';
    if week_price is null or week_price <= 0 then
      raise exception 'Featured placements are not on sale right now' using errcode = 'P0001';
    end if;
    select p.reference into open_ref from public.payments p
     where p.owner_id = me and p.status = 'pending' and p.purpose = 'featured_placement' and p.hostel_id = hostel.id
       and p.featured_weeks = p_weeks and p.amount = week_price * p_weeks and p.created_at > now() - interval '30 minutes'
     order by p.created_at desc limit 1;
    if open_ref is null then
      perform public.check_pending_payment_cap(me);
      insert into public.payments (owner_id, purpose, reference, amount, currency, hostel_id, featured_weeks)
      values (me, 'featured_placement', ref, week_price * p_weeks, 'GHS', hostel.id, p_weeks);
      open_ref := ref;
    end if;
    return query select open_ref, week_price * p_weeks, 'GHS'::text,
      format('Feature %s for %s week%s', hostel.name, p_weeks, case when p_weeks = 1 then '' else 's' end);

  else
    raise exception 'Unknown payment purpose' using errcode = 'P0001';
  end if;
end;
$$;

-- Each checkout leaves a pending row; cap them so the table cannot be flooded.
create or replace function public.check_pending_payment_cap(p_owner uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.payments p where p.owner_id = p_owner and p.status = 'pending'
        and p.created_at > now() - interval '1 hour') >= 10 then
    raise exception 'Too many unfinished payments. Wait a few minutes and try again.' using errcode = 'P0001';
  end if;
end;
$$;
revoke all on function public.check_pending_payment_cap(uuid) from public, anon, authenticated;

-- The server records the Paystack checkout page it opened for a payment, so a
-- repeated click returns to that page instead of opening another.
create or replace function public.remember_checkout(p_reference text, p_url text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_url is null or p_url !~ '^https?://' or char_length(p_url) > 500 then
    raise exception 'Invalid checkout address' using errcode = '22023';
  end if;
  update public.payments set checkout_url = p_url
   where reference = p_reference and owner_id = auth.uid() and status = 'pending' and checkout_url is null;
end;
$$;
revoke all on function public.remember_checkout(text, text) from public, anon;
grant execute on function public.remember_checkout(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Query performance
-- ---------------------------------------------------------------------------

-- Foreign keys used by dashboards, deletes and admin pages had no index.
create index saved_hostels_hostel_idx on public.saved_hostels (hostel_id);
create index inspection_requests_room_type_idx on public.inspection_requests (room_type_id) where room_type_id is not null;
create index featured_placements_hostel_idx on public.featured_placements (hostel_id, ends_at desc);
create index featured_placements_payment_idx on public.featured_placements (payment_id) where payment_id is not null;
create index payments_hostel_idx on public.payments (hostel_id) where hostel_id is not null;
create index payments_plan_idx on public.payments (plan_id) where plan_id is not null;
create index payments_subscription_idx on public.payments (subscription_id) where subscription_id is not null;
create index subscriptions_plan_idx on public.subscriptions (plan_id);
create index verification_applications_owner_idx on public.verification_applications (owner_id, submitted_at desc);
create index verification_applications_reviewer_idx on public.verification_applications (reviewer_id) where reviewer_id is not null;
create index verification_documents_application_idx on public.verification_documents (application_id);
create index audit_log_actor_idx on public.audit_log (actor_id) where actor_id is not null;

-- Row-level policies that call auth.uid() directly evaluate it once per row.
-- Wrapped in a sub-select, Postgres evaluates it once per query. The
-- expressions are otherwise unchanged.
do $$
declare
  pol record;
  stmt text;
begin
  for pol in
    select tablename, policyname, qual, with_check from pg_policies
    where schemaname = 'public'
      and (coalesce(qual, '') ~ 'auth\.uid\(\)' or coalesce(with_check, '') ~ 'auth\.uid\(\)')
  loop
    stmt := format('alter policy %I on public.%I', pol.policyname, pol.tablename);
    if pol.qual is not null then
      stmt := stmt || format(' using (%s)', replace(replace(pol.qual, '( SELECT auth.uid() AS uid)', 'auth.uid()'), 'auth.uid()', '(select auth.uid())'));
    end if;
    if pol.with_check is not null then
      stmt := stmt || format(' with check (%s)', replace(replace(pol.with_check, '( SELECT auth.uid() AS uid)', 'auth.uid()'), 'auth.uid()', '(select auth.uid())'));
    end if;
    execute stmt;
  end loop;
end;
$$;
