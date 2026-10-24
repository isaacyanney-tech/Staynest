-- StayNest: hostel ratings.
--
-- A student may rate a hostel once (and edit or remove that rating) after the
-- owner has accepted one of their inspection requests for it. Admins can hide
-- a rating; hidden ratings no longer count towards the average. The average
-- and count are kept on hostels so cards and search need no join.

alter table public.hostels
  add column rating_avg numeric(3, 2) check (rating_avg is null or rating_avg between 1 and 5),
  add column rating_count int not null default 0 check (rating_count >= 0);

create table public.hostel_ratings (
  id uuid primary key default gen_random_uuid(),
  hostel_id uuid not null references public.hostels (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  stars smallint not null check (stars between 1 and 5),
  comment text not null default '' check (char_length(comment) <= 600),
  -- First name and initial, copied when the rating is written, so the public
  -- can see who rated without reading profiles.
  reviewer_name text not null default '',
  is_hidden boolean not null default false,
  hidden_reason text check (hidden_reason is null or char_length(hidden_reason) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (hostel_id, student_id)
);

create index hostel_ratings_hostel_idx on public.hostel_ratings (hostel_id, created_at desc) where not is_hidden;
create index hostel_ratings_student_idx on public.hostel_ratings (student_id);
create index hostel_ratings_recent_idx on public.hostel_ratings (created_at desc) where not is_hidden;

create trigger hostel_ratings_touch before update on public.hostel_ratings
  for each row execute function public.touch_updated_at();

-- True when the caller is a student whose inspection of this hostel the owner
-- accepted (or that was completed).
create or replace function public.can_rate_hostel(p_hostel uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_app_role() = 'student', false)
     and exists (
       select 1 from public.inspection_requests i
       where i.hostel_id = p_hostel and i.student_id = auth.uid()
         and i.status in ('accepted', 'completed')
     )
$$;

create or replace function public.guard_rating_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  full_name text;
begin
  if public.is_admin() or public.is_privileged_connection() then
    if tg_op = 'UPDATE' and new.is_hidden is distinct from old.is_hidden then
      perform public.write_audit(case when new.is_hidden then 'rating.hidden' else 'rating.shown' end,
        'hostel_ratings', new.id::text, jsonb_build_object('reason', new.hidden_reason));
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' and (new.hostel_id is distinct from old.hostel_id or new.student_id is distinct from old.student_id) then
    raise exception 'Cannot move a rating' using errcode = '42501';
  end if;
  if new.student_id is distinct from auth.uid() then
    raise exception 'You can only rate as yourself' using errcode = '42501';
  end if;
  if not public.can_rate_hostel(new.hostel_id) then
    raise exception 'You can rate a hostel once the owner has accepted your inspection request' using errcode = '42501';
  end if;

  -- Moderation stays with admins: a student edit keeps the hidden state.
  if tg_op = 'INSERT' then
    new.is_hidden := false;
    new.hidden_reason := null;
  else
    new.is_hidden := old.is_hidden;
    new.hidden_reason := old.hidden_reason;
  end if;
  new.comment := btrim(new.comment);

  select p.full_name into full_name from public.profiles p where p.id = new.student_id;
  full_name := btrim(coalesce(full_name, ''));
  new.reviewer_name := case
    when full_name = '' then 'A student'
    when position(' ' in full_name) = 0 then full_name
    else split_part(full_name, ' ', 1) || ' ' || left(regexp_replace(full_name, '^.*\s', ''), 1) || '.'
  end;
  return new;
end;
$$;

create trigger hostel_ratings_guard before insert or update on public.hostel_ratings
  for each row execute function public.guard_rating_write();

create or replace function public.refresh_hostel_rating()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid := coalesce(new.hostel_id, old.hostel_id);
begin
  update public.hostels h set
    rating_avg = (select round(avg(r.stars)::numeric, 2) from public.hostel_ratings r where r.hostel_id = target and not r.is_hidden),
    rating_count = (select count(*) from public.hostel_ratings r where r.hostel_id = target and not r.is_hidden)
  where h.id = target;
  return null;
end;
$$;

create trigger hostel_ratings_rollup after insert or update or delete on public.hostel_ratings
  for each row execute function public.refresh_hostel_rating();

-- Owners must not be able to write the rating rollups directly.
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
    new.rating_avg := null;
    new.rating_count := 0;
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

  -- Rollups are maintained by the room_types and hostel_ratings triggers
  -- (which run nested, at trigger depth > 1); ignore values sent directly by clients.
  if pg_trigger_depth() <= 1 then
    new.price_from := old.price_from;
    new.rooms_available := old.rooms_available;
    new.rating_avg := old.rating_avg;
    new.rating_count := old.rating_count;
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


alter table public.hostel_ratings enable row level security;

create policy "ratings: public read visible" on public.hostel_ratings for select
  using (not is_hidden and public.hostel_is_public(hostel_id));
create policy "ratings: student read own" on public.hostel_ratings for select to authenticated
  using (student_id = auth.uid());
create policy "ratings: owner read own hostels" on public.hostel_ratings for select to authenticated
  using (public.owns_hostel(hostel_id));
create policy "ratings: student create" on public.hostel_ratings for insert to authenticated
  with check (student_id = auth.uid() and public.can_rate_hostel(hostel_id));
create policy "ratings: student update own" on public.hostel_ratings for update to authenticated
  using (student_id = auth.uid()) with check (student_id = auth.uid());
create policy "ratings: student delete own" on public.hostel_ratings for delete to authenticated
  using (student_id = auth.uid());
create policy "ratings: admin all" on public.hostel_ratings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select on public.hostel_ratings to anon, authenticated;
grant insert, update, delete on public.hostel_ratings to authenticated;

revoke execute on function public.guard_rating_write() from public, anon, authenticated;
revoke execute on function public.refresh_hostel_rating() from public, anon, authenticated;
revoke execute on function public.guard_hostel_write() from public, anon, authenticated;

-- Homepage section showing recent ratings. Administrators edit its heading
-- and can hide it like any other section; it shows nothing until students
-- have rated.
alter table public.page_sections drop constraint page_sections_type_check;
alter table public.page_sections add constraint page_sections_type_check check (type in (
  'hero', 'search_intro', 'featured_hostels', 'popular_universities', 'how_it_works',
  'trust', 'about', 'cta', 'faq', 'rich_text', 'contact', 'footer', 'ratings'
));

with section as (
  insert into public.page_sections (page_id, key, type, label, sort_order, published, published_at)
  select id, 'ratings', 'ratings', 'Student ratings', 35, $json${
    "heading": "What students say after inspecting",
    "subheading": "Only students whose inspection an owner accepted can rate a hostel.",
    "limit": 6
  }$json$::jsonb, now()
  from public.pages where slug = 'home'
  on conflict (page_id, key) do nothing
  returning id, published
)
insert into public.page_section_drafts (section_id, content)
select id, published from section;
