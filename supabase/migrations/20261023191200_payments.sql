-- StayNest: Paystack payments for plans and featured placements.
--
-- Flow: an owner calls start_payment(), which prices the purchase from the
-- database and records a pending payment. The server then opens a Paystack
-- checkout for that reference. When Paystack reports the result (callback or
-- signed webhook), the server re-fetches the transaction from Paystack and
-- calls finalize_payment() with the service role. finalize_payment() checks
-- the amount and currency against the pending row and grants the purchase
-- exactly once, however many times it is called.

alter table public.payments
  add column featured_weeks int check (featured_weeks is null or featured_weeks between 1 and 12),
  add column gateway_response text check (gateway_response is null or char_length(gateway_response) <= 300);

alter table public.payments
  add constraint payments_purpose_fields check (
    (purpose = 'subscription' and plan_id is not null)
    or (purpose = 'featured_placement' and hostel_id is not null and featured_weeks is not null)
  ) not valid;

create index payments_status_idx on public.payments (status, created_at desc);

-- ------------------------------------------------------------------ start

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
  ref text := 'sn_' || replace(gen_random_uuid()::text, '-', '');
begin
  if me is null or not public.is_owner() then
    raise exception 'Only hostel owners can make payments' using errcode = '42501';
  end if;
  -- Each checkout leaves a pending row; cap them so the table cannot be flooded.
  if (select count(*) from public.payments p where p.owner_id = me and p.status = 'pending'
        and p.created_at > now() - interval '1 hour') >= 10 then
    raise exception 'Too many unfinished payments. Wait a few minutes and try again.' using errcode = 'P0001';
  end if;

  if p_purpose = 'subscription' then
    select * into plan from public.plans p where p.code = p_plan_code and p.is_active;
    if plan is null then
      raise exception 'That plan is not available' using errcode = 'P0001';
    end if;
    if plan.price_amount <= 0 then
      raise exception 'That plan is free and needs no payment' using errcode = 'P0001';
    end if;
    insert into public.payments (owner_id, purpose, reference, amount, currency, plan_id)
    values (me, 'subscription', ref, plan.price_amount, plan.currency, plan.id);
    return query select ref, plan.price_amount, plan.currency,
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
    insert into public.payments (owner_id, purpose, reference, amount, currency, hostel_id, featured_weeks)
    values (me, 'featured_placement', ref, week_price * p_weeks, 'GHS', hostel.id, p_weeks);
    return query select ref, week_price * p_weeks, 'GHS'::text,
      format('Feature %s for %s week%s', hostel.name, p_weeks, case when p_weeks = 1 then '' else 's' end);

  else
    raise exception 'Unknown payment purpose' using errcode = 'P0001';
  end if;
end;
$$;

-- ------------------------------------------------------------------ finalize

-- Starts a featured placement after any placement the hostel already has.
create or replace function public.add_featured_time(p_hostel uuid, p_days int, p_source text, p_payment uuid, p_by uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  start_at timestamptz;
begin
  select greatest(now(), coalesce(max(f.ends_at), now())) into start_at
    from public.featured_placements f where f.hostel_id = p_hostel and f.ends_at > now();
  insert into public.featured_placements (hostel_id, starts_at, ends_at, source, payment_id, created_by)
  values (p_hostel, start_at, start_at + make_interval(days => p_days), p_source, p_payment, p_by);
  return start_at + make_interval(days => p_days);
end;
$$;

create or replace function public.finalize_payment(
  p_reference text, p_status text, p_amount_minor bigint, p_currency text, p_gateway_response text, p_payload jsonb
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  pay record;
  plan record;
  current_sub record;
  period_start timestamptz;
  step interval;
  sub_id uuid;
begin
  -- Only the server, after asking Paystack itself, may settle a payment.
  if not public.is_privileged_connection() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  select * into pay from public.payments where reference = p_reference for update;
  if pay is null then
    return 'unknown';
  end if;
  if pay.status = 'success' then
    return 'already_settled';
  end if;

  if p_status <> 'success' then
    update public.payments
       set status = case when p_status = 'abandoned' then 'abandoned' else 'failed' end,
           gateway_response = left(p_gateway_response, 300),
           provider_payload = p_payload,
           verified_at = now()
     where id = pay.id;
    return 'not_paid';
  end if;

  -- Paystack reports amounts in the minor unit (pesewas).
  if p_amount_minor <> round(pay.amount * 100) or upper(p_currency) <> pay.currency then
    update public.payments
       set status = 'failed', gateway_response = 'Amount or currency did not match', provider_payload = p_payload, verified_at = now()
     where id = pay.id;
    perform public.write_audit('payment.mismatch', 'payments', pay.id::text,
      jsonb_build_object('reference', p_reference, 'expected', pay.amount, 'paid_minor', p_amount_minor, 'currency', p_currency));
    return 'mismatch';
  end if;

  update public.payments
     set status = 'success', gateway_response = left(p_gateway_response, 300), provider_payload = p_payload, verified_at = now()
   where id = pay.id;

  if pay.purpose = 'subscription' then
    select * into plan from public.plans where id = pay.plan_id;
    step := case when plan.billing_interval = 'year' then interval '1 year' else interval '1 month' end;
    -- Renewing the same plan extends it; any other plan replaces what is active.
    select * into current_sub from public.subscriptions s
     where s.owner_id = pay.owner_id and s.status = 'active' and s.current_period_end > now()
     order by s.current_period_end desc limit 1;
    if current_sub is not null and current_sub.plan_id = plan.id then
      update public.subscriptions set current_period_end = current_period_end + step where id = current_sub.id;
      sub_id := current_sub.id;
    else
      update public.subscriptions set status = 'cancelled'
       where owner_id = pay.owner_id and status = 'active';
      period_start := now();
      insert into public.subscriptions (owner_id, plan_id, status, price_amount, currency, plan_name, listing_limit,
                                        featured_slots, current_period_start, current_period_end)
      values (pay.owner_id, plan.id, 'active', pay.amount, pay.currency, plan.name, plan.listing_limit,
              plan.featured_slots, period_start, period_start + step)
      returning id into sub_id;
    end if;
    update public.payments set subscription_id = sub_id where id = pay.id;
  else
    perform public.add_featured_time(pay.hostel_id, pay.featured_weeks * 7, 'paid', pay.id, pay.owner_id);
  end if;

  perform public.write_audit('payment.succeeded', 'payments', pay.id::text,
    jsonb_build_object('reference', p_reference, 'purpose', pay.purpose, 'amount', pay.amount));
  return 'settled';
end;
$$;

-- ------------------------------------------------------------------ included featured slots

-- Featured weeks included in the owner's active plan and how many are used this period.
create or replace function public.featured_slots_left(p_owner uuid)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select greatest(s.featured_slots - (
      select count(*) from public.featured_placements f
        join public.hostels h on h.id = f.hostel_id
       where h.owner_id = p_owner and f.source = 'subscription' and f.created_at >= s.current_period_start
    ), 0)::int
    from public.subscriptions s
    where s.owner_id = p_owner and s.status = 'active' and s.current_period_end > now()
    order by s.current_period_end desc limit 1
  ), 0)
$$;

create or replace function public.use_featured_slot(p_hostel uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  hostel record;
begin
  if me is null or not public.is_owner() then
    raise exception 'Only hostel owners can do that' using errcode = '42501';
  end if;
  select h.id, h.status into hostel from public.hostels h where h.id = p_hostel and h.owner_id = me for update;
  if hostel is null then
    raise exception 'You can only feature your own hostels' using errcode = '42501';
  end if;
  if hostel.status <> 'published' then
    raise exception 'Only published listings can be featured' using errcode = 'P0001';
  end if;
  -- Serialise per owner so two clicks cannot spend the same slot twice.
  perform 1 from public.profiles where id = me for update;
  if public.featured_slots_left(me) < 1 then
    raise exception 'Your plan has no featured weeks left this period' using errcode = 'P0001';
  end if;
  return public.add_featured_time(p_hostel, 7, 'subscription', null, me);
end;
$$;

-- ------------------------------------------------------------------ privileges

revoke all on function public.start_payment(text, text, uuid, int) from public, anon;
grant execute on function public.start_payment(text, text, uuid, int) to authenticated;
revoke all on function public.use_featured_slot(uuid) from public, anon;
grant execute on function public.use_featured_slot(uuid) to authenticated;
revoke all on function public.featured_slots_left(uuid) from public, anon, authenticated;
revoke all on function public.add_featured_time(uuid, int, text, uuid, uuid) from public, anon, authenticated;
revoke all on function public.finalize_payment(text, text, bigint, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.finalize_payment(text, text, bigint, text, text, jsonb) to service_role;
grant execute on function public.featured_slots_left(uuid) to service_role;

-- Owners see how many included featured weeks they have left.
create or replace function public.my_featured_slots_left()
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select public.featured_slots_left(auth.uid())
$$;
revoke all on function public.my_featured_slots_left() from public, anon;
grant execute on function public.my_featured_slots_left() to authenticated;
