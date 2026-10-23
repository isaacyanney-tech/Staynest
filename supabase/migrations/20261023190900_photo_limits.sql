-- StayNest: photos per hostel are capped by the owner's plan (plans.photo_limit),
-- and verification documents must live in the owner's own storage folder.

create or replace function public.owner_photo_limit(p_owner uuid)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.photo_limit from public.subscriptions s
       join public.plans p on p.id = s.plan_id
      where s.owner_id = p_owner and s.status = 'active'
        and (s.current_period_end is null or s.current_period_end > now())
      order by s.created_at desc limit 1),
    (select p.photo_limit from public.plans p where p.is_default and p.is_active limit 1),
    8
  )
$$;

create or replace function public.enforce_photo_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
  v_used int;
  v_allowed int;
begin
  if public.is_admin() or public.is_privileged_connection() then
    return new;
  end if;
  select h.owner_id into v_owner from public.hostels h where h.id = new.hostel_id;
  if v_owner is null then
    return new;
  end if;
  select count(*) into v_used from public.hostel_media m where m.hostel_id = new.hostel_id;
  v_allowed := public.owner_photo_limit(v_owner);
  if v_used >= v_allowed then
    raise exception 'Your plan allows % photos per hostel. Remove one or upgrade to add more.', v_allowed using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger hostel_media_photo_limit before insert on public.hostel_media
  for each row execute function public.enforce_photo_limit();

revoke execute on function public.owner_photo_limit(uuid) from public, anon, authenticated;
revoke execute on function public.enforce_photo_limit() from public, anon, authenticated;

alter policy "verification docs: owner add" on public.verification_documents
  with check (
    starts_with(storage_path, concat(auth.uid()::text, '/', application_id::text, '/'))
    and exists (select 1 from public.verification_applications a
                where a.id = application_id and a.owner_id = auth.uid()
                  and a.status in ('pending', 'needs_info'))
  );
