-- StayNest: universities, hostels, rooms, media, saved hostels, inspections, verification.

create type public.listing_status as enum ('draft', 'pending_review', 'published', 'rejected', 'suspended');
create type public.gender_policy as enum ('mixed', 'male', 'female');
create type public.price_period as enum ('semester', 'academic_year', 'month');
create type public.inspection_status as enum ('requested', 'accepted', 'rescheduled', 'declined', 'completed', 'cancelled');
create type public.verification_status as enum ('pending', 'needs_info', 'approved', 'rejected');

create table public.universities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 160),
  short_name text not null check (char_length(short_name) between 2 and 24),
  city text not null,
  region text,
  description text not null default '',
  image_path text,
  image_alt text not null default '',
  is_popular boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.hostels (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles (id) on delete cascade,
  university_id uuid references public.universities (id) on delete set null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 3 and 120),
  summary text not null default '' check (char_length(summary) <= 240),
  description text not null default '' check (char_length(description) <= 6000),
  address text not null default '',
  area text not null default '',
  city text not null default '',
  distance_km numeric(5, 2) check (distance_km is null or distance_km between 0 and 200),
  gender_policy public.gender_policy not null default 'mixed',
  amenities text[] not null default '{}',
  house_rules text not null default '' check (char_length(house_rules) <= 3000),
  contact_phone text check (contact_phone is null or contact_phone ~ '^[0-9+() -]{7,20}$'),
  status public.listing_status not null default 'draft',
  moderation_note text,
  is_verified boolean not null default false,
  is_demo boolean not null default false,
  price_from numeric(12, 2),
  rooms_available int not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(name, '')), 'A')
    || setweight(to_tsvector('simple', coalesce(area, '') || ' ' || coalesce(city, '')), 'B')
    || setweight(to_tsvector('simple', coalesce(summary, '')), 'C')
  ) stored,
  -- Real listings always have an owner; only illustrative demo rows may not.
  constraint hostels_owner_required check (owner_id is not null or is_demo)
);

create index hostels_status_idx on public.hostels (status);
create index hostels_university_idx on public.hostels (university_id) where status = 'published';
create index hostels_owner_idx on public.hostels (owner_id);
create index hostels_price_idx on public.hostels (price_from) where status = 'published';
create index hostels_search_idx on public.hostels using gin (search);

create trigger hostels_touch before update on public.hostels
  for each row execute function public.touch_updated_at();

create table public.room_types (
  id uuid primary key default gen_random_uuid(),
  hostel_id uuid not null references public.hostels (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  occupancy int not null check (occupancy between 1 and 12),
  price_amount numeric(12, 2) not null check (price_amount > 0 and price_amount < 1000000),
  price_period public.price_period not null default 'academic_year',
  total_rooms int not null default 1 check (total_rooms >= 0),
  available_rooms int not null default 0 check (available_rooms >= 0),
  description text not null default '' check (char_length(description) <= 1000),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint room_types_available_le_total check (available_rooms <= total_rooms)
);

create index room_types_hostel_idx on public.room_types (hostel_id);
create trigger room_types_touch before update on public.room_types
  for each row execute function public.touch_updated_at();

create table public.hostel_media (
  id uuid primary key default gen_random_uuid(),
  hostel_id uuid not null references public.hostels (id) on delete cascade,
  storage_path text,
  external_url text,
  alt_text text not null check (char_length(alt_text) between 3 and 200),
  caption text check (caption is null or char_length(caption) <= 200),
  credit text,
  width int,
  height int,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  constraint hostel_media_source check ((storage_path is not null) <> (external_url is not null))
);

create index hostel_media_hostel_idx on public.hostel_media (hostel_id, sort_order);

create table public.saved_hostels (
  user_id uuid not null references public.profiles (id) on delete cascade,
  hostel_id uuid not null references public.hostels (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, hostel_id)
);

create table public.inspection_requests (
  id uuid primary key default gen_random_uuid(),
  hostel_id uuid not null references public.hostels (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  room_type_id uuid references public.room_types (id) on delete set null,
  preferred_date date not null,
  preferred_time text not null default 'morning' check (preferred_time in ('morning', 'afternoon', 'evening')),
  message text not null default '' check (char_length(message) <= 1000),
  status public.inspection_status not null default 'requested',
  owner_response text check (owner_response is null or char_length(owner_response) <= 1000),
  proposed_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index inspection_requests_hostel_idx on public.inspection_requests (hostel_id, created_at desc);
create index inspection_requests_student_idx on public.inspection_requests (student_id, created_at desc);
create trigger inspection_requests_touch before update on public.inspection_requests
  for each row execute function public.touch_updated_at();

create table public.verification_applications (
  id uuid primary key default gen_random_uuid(),
  hostel_id uuid not null references public.hostels (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  status public.verification_status not null default 'pending',
  owner_note text not null default '' check (char_length(owner_note) <= 2000),
  reviewer_id uuid references public.profiles (id) on delete set null,
  reviewer_note text check (reviewer_note is null or char_length(reviewer_note) <= 2000),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz
);

-- At most one open application per hostel.
create unique index verification_one_open_per_hostel
  on public.verification_applications (hostel_id) where status in ('pending', 'needs_info');

create table public.verification_documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.verification_applications (id) on delete cascade,
  storage_path text not null,
  doc_type text not null check (doc_type in ('ownership', 'identity', 'business_registration', 'other')),
  file_name text not null,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------------
-- Helpers used by policies
-- ------------------------------------------------------------------

create or replace function public.owns_hostel(p_hostel uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.hostels h
    where h.id = p_hostel and h.owner_id = auth.uid() and public.is_owner()
  )
$$;

create or replace function public.hostel_is_public(p_hostel uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.hostels h where h.id = p_hostel and h.status = 'published')
$$;

-- Keep price_from / rooms_available on hostels in sync with room types,
-- so search can filter and sort without joins.
create or replace function public.refresh_hostel_rollups()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid := coalesce(new.hostel_id, old.hostel_id);
begin
  update public.hostels h set
    price_from = (select min(r.price_amount) from public.room_types r where r.hostel_id = target),
    rooms_available = coalesce((select sum(r.available_rooms) from public.room_types r where r.hostel_id = target), 0)
  where h.id = target;
  return null;
end;
$$;

create trigger room_types_rollup after insert or update or delete on public.room_types
  for each row execute function public.refresh_hostel_rollups();

-- Owners may edit their listing content but not moderation fields, and may
-- only move status between draft and pending_review (or withdraw to draft).
create or replace function public.guard_hostel_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.is_admin() or public.is_privileged_connection() then
    if tg_op = 'UPDATE' and new.status is distinct from old.status then
      if new.status = 'published' and old.published_at is null then
        new.published_at := now();
      end if;
      perform public.write_audit('hostel.status_changed', 'hostels', new.id::text,
        jsonb_build_object('from', old.status, 'to', new.status, 'note', new.moderation_note));
    end if;
    if tg_op = 'UPDATE' and new.is_verified is distinct from old.is_verified then
      perform public.write_audit('hostel.verification_changed', 'hostels', new.id::text,
        jsonb_build_object('verified', new.is_verified));
    end if;
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.owner_id := auth.uid();
    new.is_verified := false;
    new.is_demo := false;
    new.moderation_note := null;
    new.published_at := null;
    new.price_from := null;
    new.rooms_available := 0;
    if new.status not in ('draft', 'pending_review') then
      new.status := 'draft';
    end if;
    return new;
  end if;

  -- UPDATE by owner
  if new.owner_id is distinct from old.owner_id
     or new.is_verified is distinct from old.is_verified
     or new.is_demo is distinct from old.is_demo
     or new.moderation_note is distinct from old.moderation_note
     or new.published_at is distinct from old.published_at then
    raise exception 'You cannot change moderation fields' using errcode = '42501';
  end if;

  -- Rollups are maintained by the room_types trigger (which runs nested, at
  -- trigger depth > 1); ignore values sent directly by clients.
  if pg_trigger_depth() <= 1 then
    new.price_from := old.price_from;
    new.rooms_available := old.rooms_available;
  end if;

  if new.status is distinct from old.status then
    if old.status in ('suspended') then
      raise exception 'This listing is suspended. Contact support.' using errcode = '42501';
    end if;
    if new.status not in ('draft', 'pending_review') then
      raise exception 'Listings are published by StayNest moderators' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger hostels_guard before insert or update on public.hostels
  for each row execute function public.guard_hostel_write();

-- Inspection requests: students create and may cancel; owners respond.
create or replace function public.guard_inspection_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  is_student boolean := (new.student_id = auth.uid());
  is_hostel_owner boolean := public.owns_hostel(new.hostel_id);
begin
  if public.is_admin() or public.is_privileged_connection() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if not public.hostel_is_public(new.hostel_id) then
      raise exception 'This hostel is not accepting inspection requests' using errcode = '42501';
    end if;
    if exists (select 1 from public.hostels h where h.id = new.hostel_id and h.is_demo) then
      raise exception 'Illustrative listings cannot be inspected' using errcode = '42501';
    end if;
    if new.preferred_date < current_date then
      raise exception 'Choose a date from today onwards' using errcode = '22023';
    end if;
    new.status := 'requested';
    new.owner_response := null;
    new.proposed_date := null;
    return new;
  end if;

  if new.hostel_id is distinct from old.hostel_id
     or new.student_id is distinct from old.student_id then
    raise exception 'Cannot move an inspection request' using errcode = '42501';
  end if;

  if is_student and not is_hostel_owner then
    if new.owner_response is distinct from old.owner_response
       or new.proposed_date is distinct from old.proposed_date
       or (new.status is distinct from old.status and new.status <> 'cancelled') then
      raise exception 'Students can only cancel a request' using errcode = '42501';
    end if;
    return new;
  end if;

  if is_hostel_owner then
    if new.preferred_date is distinct from old.preferred_date
       or new.message is distinct from old.message
       or new.room_type_id is distinct from old.room_type_id then
      raise exception 'Owners cannot edit the student''s request' using errcode = '42501';
    end if;
    if new.status = 'cancelled' and old.status <> 'cancelled' then
      raise exception 'Owners decline rather than cancel' using errcode = '42501';
    end if;
    if new.status = 'rescheduled' and new.proposed_date is null then
      raise exception 'Propose a new date when rescheduling' using errcode = '22023';
    end if;
    return new;
  end if;

  raise exception 'Not allowed' using errcode = '42501';
end;
$$;

create trigger inspection_requests_guard before insert or update on public.inspection_requests
  for each row execute function public.guard_inspection_write();

-- Verification: owners submit; only admins decide (and that flips hostels.is_verified).
create or replace function public.guard_verification_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.is_admin() or public.is_privileged_connection() then
    if tg_op = 'UPDATE' and new.status is distinct from old.status then
      new.reviewer_id := auth.uid();
      new.reviewed_at := now();
      update public.hostels set is_verified = (new.status = 'approved') where id = new.hostel_id
        and new.status in ('approved', 'rejected');
      perform public.write_audit('verification.decided', 'verification_applications', new.id::text,
        jsonb_build_object('status', new.status, 'hostel_id', new.hostel_id));
    end if;
    return new;
  end if;

  if tg_op = 'INSERT' then
    if not public.owns_hostel(new.hostel_id) then
      raise exception 'You can only verify your own hostels' using errcode = '42501';
    end if;
    new.owner_id := auth.uid();
    new.status := 'pending';
    new.reviewer_id := null;
    new.reviewer_note := null;
    new.reviewed_at := null;
    return new;
  end if;

  -- Owner update: only the note, and only while the application is open;
  -- answering a needs_info request moves it back to pending.
  if new.status is distinct from old.status and not (old.status = 'needs_info' and new.status = 'pending') then
    raise exception 'Only administrators decide verification' using errcode = '42501';
  end if;
  if new.reviewer_id is distinct from old.reviewer_id or new.reviewer_note is distinct from old.reviewer_note
     or new.reviewed_at is distinct from old.reviewed_at or new.hostel_id is distinct from old.hostel_id
     or new.owner_id is distinct from old.owner_id then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if old.status not in ('pending', 'needs_info') then
    raise exception 'This application is closed' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger verification_guard before insert or update on public.verification_applications
  for each row execute function public.guard_verification_write();

-- ------------------------------------------------------------------
-- Row level security
-- ------------------------------------------------------------------

alter table public.universities enable row level security;
alter table public.hostels enable row level security;
alter table public.room_types enable row level security;
alter table public.hostel_media enable row level security;
alter table public.saved_hostels enable row level security;
alter table public.inspection_requests enable row level security;
alter table public.verification_applications enable row level security;
alter table public.verification_documents enable row level security;

create policy "universities: public read" on public.universities for select using (true);
create policy "universities: admin write" on public.universities for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "hostels: public read published" on public.hostels for select
  using (status = 'published');
create policy "hostels: owner read own" on public.hostels for select to authenticated
  using (owner_id = auth.uid());
create policy "hostels: admin read" on public.hostels for select to authenticated
  using (public.is_admin());
create policy "hostels: owner insert" on public.hostels for insert to authenticated
  with check (public.is_owner() and owner_id = auth.uid());
create policy "hostels: owner update own" on public.hostels for update to authenticated
  using (owner_id = auth.uid() and public.is_owner()) with check (owner_id = auth.uid());
create policy "hostels: owner delete draft" on public.hostels for delete to authenticated
  using (owner_id = auth.uid() and public.is_owner() and status in ('draft', 'rejected'));
create policy "hostels: admin write" on public.hostels for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "rooms: public read" on public.room_types for select
  using (public.hostel_is_public(hostel_id));
create policy "rooms: owner all" on public.room_types for all to authenticated
  using (public.owns_hostel(hostel_id)) with check (public.owns_hostel(hostel_id));
create policy "rooms: admin all" on public.room_types for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "media: public read" on public.hostel_media for select
  using (public.hostel_is_public(hostel_id));
create policy "media: owner all" on public.hostel_media for all to authenticated
  using (public.owns_hostel(hostel_id)) with check (public.owns_hostel(hostel_id));
create policy "media: admin all" on public.hostel_media for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "saved: own" on public.saved_hostels for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "inspections: student read own" on public.inspection_requests for select to authenticated
  using (student_id = auth.uid());
create policy "inspections: owner read" on public.inspection_requests for select to authenticated
  using (public.owns_hostel(hostel_id));
create policy "inspections: admin read" on public.inspection_requests for select to authenticated
  using (public.is_admin());
create policy "inspections: student create" on public.inspection_requests for insert to authenticated
  with check (student_id = auth.uid() and public.current_app_role() = 'student');
create policy "inspections: student update own" on public.inspection_requests for update to authenticated
  using (student_id = auth.uid()) with check (student_id = auth.uid());
create policy "inspections: owner respond" on public.inspection_requests for update to authenticated
  using (public.owns_hostel(hostel_id)) with check (public.owns_hostel(hostel_id));

create policy "verification: owner read own" on public.verification_applications for select to authenticated
  using (owner_id = auth.uid());
create policy "verification: owner create" on public.verification_applications for insert to authenticated
  with check (owner_id = auth.uid() and public.owns_hostel(hostel_id));
create policy "verification: owner update open" on public.verification_applications for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "verification: admin all" on public.verification_applications for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "verification docs: owner read" on public.verification_documents for select to authenticated
  using (exists (select 1 from public.verification_applications a
                 where a.id = application_id and a.owner_id = auth.uid()));
create policy "verification docs: owner add" on public.verification_documents for insert to authenticated
  with check (exists (select 1 from public.verification_applications a
                      where a.id = application_id and a.owner_id = auth.uid()
                        and a.status in ('pending', 'needs_info')));
create policy "verification docs: admin read" on public.verification_documents for select to authenticated
  using (public.is_admin());
