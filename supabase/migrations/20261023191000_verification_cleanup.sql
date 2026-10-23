-- StayNest: an owner may withdraw a verification request that nobody has
-- reviewed yet, including its stored documents. This lets a failed upload be
-- rolled back cleanly. Reviewed requests and their documents stay.

create policy "verification: owner delete unreviewed" on public.verification_applications for delete to authenticated
  using (owner_id = auth.uid() and status = 'pending' and reviewer_id is null);

create policy "verification-docs: owner delete unreviewed" on storage.objects for delete to authenticated
  using (
    bucket_id = 'verification-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1 from public.verification_applications a
      where a.id::text = (storage.foldername(name))[2]
        and a.owner_id = auth.uid() and a.status = 'pending' and a.reviewer_id is null
    )
  );
