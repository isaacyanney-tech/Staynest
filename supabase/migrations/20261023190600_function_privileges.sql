-- Tighten who can call security definer functions through the REST API.
--
-- Trigger functions never need to be called directly (triggers fire regardless
-- of EXECUTE privilege). Plan-limit helpers are only used inside triggers.
-- The remaining helpers (is_admin, is_owner, current_app_role, owns_hostel,
-- hostel_is_public) stay executable because RLS policies call them as the
-- requesting role; each only reveals facts about the caller or public data.
-- publish_section / unpublish_section / restore_revision_to_draft check
-- is_admin() themselves.

do $$
declare
  fn text;
begin
  foreach fn in array array[
    'public.handle_new_user()',
    'public.guard_profile_update()',
    'public.guard_hostel_write()',
    'public.guard_inspection_write()',
    'public.guard_verification_write()',
    'public.refresh_hostel_rollups()',
    'public.enforce_listing_limit()',
    'public.audit_admin_change()',
    'public.owner_listing_limit(uuid)',
    'public.owner_has_unlimited_listings(uuid)'
  ] loop
    execute format('revoke execute on function %s from public, anon, authenticated', fn);
  end loop;
end $$;
