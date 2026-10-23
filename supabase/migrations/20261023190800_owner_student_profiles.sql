-- StayNest: owners can read the profile (name, phone) of students who asked
-- to inspect one of their hostels, so they can arrange the visit.
create policy "profiles: owner reads requesting students" on public.profiles for select to authenticated
  using (exists (
    select 1 from public.inspection_requests i
    where i.student_id = profiles.id and public.owns_hostel(i.hostel_id)
  ));
