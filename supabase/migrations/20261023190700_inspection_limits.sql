-- StayNest: inspection requests must name a room in the same hostel, a student
-- may hold one open request per hostel, and the number of open requests per
-- student is capped by business_settings.inspections.max_open_per_student.

create or replace function public.guard_inspection_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  is_student boolean := (new.student_id = auth.uid());
  is_hostel_owner boolean := public.owns_hostel(new.hostel_id);
  max_open int;
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
    if new.room_type_id is not null and not exists (
      select 1 from public.room_types r where r.id = new.room_type_id and r.hostel_id = new.hostel_id
    ) then
      raise exception 'That room type belongs to a different hostel' using errcode = '22023';
    end if;
    select coalesce((value #>> '{}')::int, 5) into max_open
      from public.business_settings where key = 'inspections.max_open_per_student';
    if (
      select count(*) from public.inspection_requests i
      where i.student_id = new.student_id and i.status in ('requested', 'accepted', 'rescheduled')
    ) >= coalesce(max_open, 5) then
      raise exception 'You have reached the limit of % open inspection requests. Cancel one to request another.', coalesce(max_open, 5)
        using errcode = 'P0001';
    end if;
    if exists (
      select 1 from public.inspection_requests i
      where i.student_id = new.student_id and i.hostel_id = new.hostel_id
        and i.status in ('requested', 'accepted', 'rescheduled')
    ) then
      raise exception 'You already have an open inspection request for this hostel' using errcode = 'P0001';
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
