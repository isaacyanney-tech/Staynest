-- StayNest: identity, roles and audit logging.
-- Roles live in public.profiles and can only be changed by an admin (or the
-- service role used by the bootstrap script). Sign-up can never produce an admin.

create type public.app_role as enum ('student', 'owner', 'admin');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null default 'student',
  full_name text not null default '' check (char_length(full_name) <= 120),
  phone text check (phone is null or phone ~ '^[0-9+() -]{7,20}$'),
  is_suspended boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'One row per auth user. role is authorisation data and is protected by trigger.';

-- Helper: the caller's role. security definer so policies can call it without
-- recursing into profiles RLS.
create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role from public.profiles p where p.id = auth.uid() and not p.is_suspended
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_app_role() = 'admin', false)
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_app_role() = 'owner', false)
$$;

-- True for connections that bypass RLS on purpose (migrations, service role).
-- Uses the session's active role setting rather than current_user, because
-- current_user is the function owner inside security definer triggers.
create or replace function public.is_privileged_connection()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(nullif(current_setting('role', true), 'none'), session_user::text)
           not in ('anon', 'authenticated')
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- New auth users get a profile. Only 'student' or 'owner' may be requested in
-- sign-up metadata; anything else (including 'admin') falls back to student.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested text := coalesce(new.raw_user_meta_data ->> 'role', 'student');
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    case when requested = 'owner' then 'owner'::public.app_role else 'student'::public.app_role end,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 120)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Audit log for sensitive operations. Written only by security definer code.
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_created_idx on public.audit_log (created_at desc);

create or replace function public.write_audit(
  p_action text, p_entity text, p_entity_id text, p_details jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_log (actor_id, action, entity, entity_id, details)
  values (auth.uid(), p_action, p_entity, p_entity_id, coalesce(p_details, '{}'::jsonb))
$$;

revoke all on function public.write_audit(text, text, text, jsonb) from public, anon, authenticated;

-- Block role / suspension changes unless the caller is an admin or privileged.
create or replace function public.guard_profile_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (new.role is distinct from old.role or new.is_suspended is distinct from old.is_suspended) then
    if not (public.is_admin() or public.is_privileged_connection()) then
      raise exception 'Only administrators can change roles or suspension' using errcode = '42501';
    end if;
    if new.id = auth.uid() and new.role is distinct from old.role then
      raise exception 'Administrators cannot change their own role' using errcode = '42501';
    end if;
    perform public.write_audit(
      'profile.access_changed', 'profiles', new.id::text,
      jsonb_build_object('from_role', old.role, 'to_role', new.role,
                         'from_suspended', old.is_suspended, 'to_suspended', new.is_suspended)
    );
  end if;
  return new;
end;
$$;

create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_update();

alter table public.profiles enable row level security;
alter table public.audit_log enable row level security;

create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = auth.uid());
create policy "profiles: admin read all" on public.profiles
  for select to authenticated using (public.is_admin());
create policy "profiles: update own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles: admin update" on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "audit: admin read" on public.audit_log
  for select to authenticated using (public.is_admin());

-- Profiles are created by trigger only.
revoke insert, delete on public.profiles from anon, authenticated;
revoke insert, update, delete on public.audit_log from anon, authenticated;
