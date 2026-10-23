-- StayNest: storage buckets and object policies.
-- Uploads go through server actions that check file signatures and re-encode
-- images; bucket limits are a second line of defence.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('public-media', 'public-media', true, 5242880,
   array['image/webp', 'image/jpeg', 'image/png', 'image/avif']),
  ('verification-docs', 'verification-docs', false, 10485760,
   array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- public-media layout:  site/<file>             (admins)
--                       hostels/<hostel_id>/<file>  (that hostel's owner, admins)
create policy "public-media: admin write" on storage.objects for all to authenticated
  using (bucket_id = 'public-media' and public.is_admin())
  with check (bucket_id = 'public-media' and public.is_admin());

create policy "public-media: owner insert hostel files" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'public-media'
    and (storage.foldername(name))[1] = 'hostels'
    and public.owns_hostel(((storage.foldername(name))[2])::uuid)
  );

create policy "public-media: owner delete hostel files" on storage.objects for delete to authenticated
  using (
    bucket_id = 'public-media'
    and (storage.foldername(name))[1] = 'hostels'
    and public.owns_hostel(((storage.foldername(name))[2])::uuid)
  );

-- Files in this bucket are public by URL anyway; allowing select lets owners
-- replace and delete their own files through the API.
create policy "public-media: read" on storage.objects for select
  using (bucket_id = 'public-media');

-- verification-docs layout: <owner uid>/<application id>/<file>
create policy "verification-docs: owner insert own" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'verification-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_owner()
  );

create policy "verification-docs: owner read own" on storage.objects for select to authenticated
  using (bucket_id = 'verification-docs' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "verification-docs: admin read" on storage.objects for select to authenticated
  using (bucket_id = 'verification-docs' and public.is_admin());
