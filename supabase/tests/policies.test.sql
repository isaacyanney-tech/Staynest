-- Permission tests for StayNest. Run with scripts/test-db.sh (plain PostgreSQL
-- plus supabase/tests/harness/supabase_stub.sql). Every assertion raises on failure.
\set ON_ERROR_STOP 1
\set QUIET 1

create schema if not exists tests;
grant usage on schema tests to anon, authenticated;

create or replace function tests.act_as(p_user uuid) returns void language plpgsql as $$
begin
  if p_user is null then
    perform set_config('request.jwt.claims', '{"role":"anon"}', false);
    execute 'set role anon';
  else
    perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, false);
    execute 'set role authenticated';
  end if;
end $$;

create or replace function tests.reset_role() returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', false);
end $$;

-- Runs p_sql and requires it to fail (optionally with a given SQLSTATE).
create or replace function tests.throws(p_name text, p_sql text, p_state text default null) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if p_state is not null and sqlstate <> p_state then
      raise exception 'FAIL %: expected SQLSTATE %, got % (%)', p_name, p_state, sqlstate, sqlerrm;
    end if;
    raise notice 'ok - %', p_name;
    return;
  end;
  raise exception 'FAIL %: statement succeeded but should have failed', p_name;
end $$;

create or replace function tests.is(p_name text, p_got anyelement, p_want anyelement) returns void language plpgsql as $$
begin
  if p_got is distinct from p_want then
    raise exception 'FAIL %: got %, want %', p_name, p_got, p_want;
  end if;
  raise notice 'ok - %', p_name;
end $$;

grant execute on all functions in schema tests to anon, authenticated;

-- Fixture users (created as the privileged test runner, as sign-up would).
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'admin@test', '{"role":"admin","full_name":"Ada Admin"}'),
  ('00000000-0000-0000-0000-0000000000a1', 'owner1@test', '{"role":"owner","full_name":"Owner One"}'),
  ('00000000-0000-0000-0000-0000000000a2', 'owner2@test', '{"role":"owner","full_name":"Owner Two"}'),
  ('00000000-0000-0000-0000-0000000000b1', 'student1@test', '{"role":"student","full_name":"Stu Dent"}'),
  ('00000000-0000-0000-0000-0000000000b2', 'student2@test', '{}');

select tests.is('sign-up asking for admin becomes student',
  (select role::text from public.profiles where id = '00000000-0000-0000-0000-00000000000a'), 'student');
select tests.is('sign-up as owner becomes owner',
  (select role::text from public.profiles where id = '00000000-0000-0000-0000-0000000000a1'), 'owner');
select tests.is('sign-up without role becomes student',
  (select role::text from public.profiles where id = '00000000-0000-0000-0000-0000000000b2'), 'student');

-- Bootstrap the first admin the way scripts/bootstrap-admin does (privileged connection).
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-00000000000a';

-- ---------------------------------------------------------------- roles
select tests.act_as('00000000-0000-0000-0000-0000000000b1');
select tests.throws('student cannot make themself admin',
  $$update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000b1'$$, '42501');
select tests.act_as('00000000-0000-0000-0000-0000000000a1');
select tests.throws('owner cannot make themself admin',
  $$update public.profiles set role = 'admin' where id = auth.uid()$$, '42501');
select tests.throws('owner cannot insert a profile row',
  $$insert into public.profiles (id, role) values ('00000000-0000-0000-0000-0000000000ff', 'admin')$$);
select tests.is('owner cannot see other profiles',
  (select count(*) from public.profiles)::int, 1);
select tests.act_as('00000000-0000-0000-0000-00000000000a');
select tests.throws('admin cannot change own role',
  $$update public.profiles set role = 'student' where id = auth.uid()$$, '42501');
update public.profiles set role = 'owner' where id = '00000000-0000-0000-0000-0000000000b2';
select tests.reset_role();
select tests.is('admin can change another user''s role',
  (select role::text from public.profiles where id = '00000000-0000-0000-0000-0000000000b2'), 'owner');
select tests.is('role change is audited',
  (select count(*) from public.audit_log where action = 'profile.access_changed'
     and entity_id = '00000000-0000-0000-0000-0000000000b2')::int, 1);
update public.profiles set role = 'student' where id = '00000000-0000-0000-0000-0000000000b2';

-- ---------------------------------------------------------------- listings
select tests.act_as('00000000-0000-0000-0000-0000000000a1');
insert into public.hostels (slug, name, status, is_verified, is_demo, university_id)
values ('owner-one-hostel', 'Owner One Hostel', 'published', true, true,
        (select id from public.universities where slug = 'knust'));
select tests.is('owner insert is forced to draft',
  (select status::text from public.hostels where slug = 'owner-one-hostel'), 'draft');
select tests.is('owner insert cannot self-verify',
  (select is_verified from public.hostels where slug = 'owner-one-hostel'), false);
select tests.is('owner insert cannot mark demo',
  (select is_demo from public.hostels where slug = 'owner-one-hostel'), false);
select tests.throws('owner cannot publish own listing',
  $$update public.hostels set status = 'published' where slug = 'owner-one-hostel'$$, '42501');
update public.hostels set status = 'pending_review' where slug = 'owner-one-hostel';
select tests.is('owner can submit for review',
  (select status::text from public.hostels where slug = 'owner-one-hostel'), 'pending_review');
select tests.throws('free plan limits owner to one listing',
  $$insert into public.hostels (slug, name) values ('owner-one-second', 'Second Hostel')$$, 'P0001');
insert into public.room_types (hostel_id, name, occupancy, price_amount, total_rooms, available_rooms)
select id, 'Two in a room', 2, 5000, 10, 4 from public.hostels where slug = 'owner-one-hostel';
select tests.is('room rollup sets price_from',
  (select price_from from public.hostels where slug = 'owner-one-hostel'), 5000.00::numeric);
update public.hostels set price_from = 1 where slug = 'owner-one-hostel';
select tests.is('owner cannot overwrite price rollup',
  (select price_from from public.hostels where slug = 'owner-one-hostel'), 5000.00::numeric);
update public.room_types set price_amount = 5500
 where hostel_id = (select id from public.hostels where slug = 'owner-one-hostel');
select tests.is('price update refreshes rollup',
  (select price_from from public.hostels where slug = 'owner-one-hostel'), 5500.00::numeric);

select tests.reset_role();
select id as h1 from public.hostels where slug = 'owner-one-hostel' \gset
select tests.act_as('00000000-0000-0000-0000-0000000000a2');
select tests.is('other owner cannot see unpublished listing',
  (select count(*) from public.hostels where slug = 'owner-one-hostel')::int, 0);
update public.hostels set name = 'Hijacked' where slug = 'owner-one-hostel';
select tests.throws('other owner cannot add rooms to it',
  format($f$insert into public.room_types (hostel_id, name, occupancy, price_amount) values (%L, 'xx', 1, 1)$f$, :'h1'));
select tests.throws('other owner cannot upload media rows to it',
  format($f$insert into public.hostel_media (hostel_id, external_url, alt_text) values (%L, 'https://x.test/a.jpg', 'alt text')$f$, :'h1'));
select tests.throws('other owner cannot add rooms by known id',
  $$insert into public.room_types (hostel_id, name, occupancy, price_amount)
    values ((select id from public.hostels where slug = 'demo-legon-courtyard'), 'xx', 1, 1)$$);
select tests.act_as('00000000-0000-0000-0000-0000000000b1');
select tests.throws('student cannot create a hostel',
  $$insert into public.hostels (slug, name) values ('student-hostel', 'Student Hostel')$$);
select tests.act_as(null);
select tests.is('anonymous visitors see only published listings',
  (select count(*) from public.hostels where status <> 'published')::int, 0);
select tests.is('anonymous visitors see demo listings',
  (select count(*) from public.hostels where is_demo)::int, 6);
select tests.reset_role();
select tests.is('hijack attempt changed nothing',
  (select name from public.hostels where slug = 'owner-one-hostel'), 'Owner One Hostel');

-- Admin publishes
select tests.act_as('00000000-0000-0000-0000-00000000000a');
update public.hostels set status = 'published', moderation_note = 'Looks good' where slug = 'owner-one-hostel';
select tests.reset_role();
select tests.is('admin publish sets published_at',
  (select published_at is not null from public.hostels where slug = 'owner-one-hostel'), true);

-- ---------------------------------------------------------------- inspections
select tests.act_as('00000000-0000-0000-0000-0000000000b1');
insert into public.inspection_requests (hostel_id, student_id, preferred_date, status, owner_response)
select id, auth.uid(), current_date + 3, 'accepted', 'fake' from public.hostels where slug = 'owner-one-hostel';
select tests.is('student request starts as requested',
  (select status::text from public.inspection_requests limit 1), 'requested');
select tests.is('student cannot pre-fill owner response',
  (select owner_response from public.inspection_requests limit 1), null::text);
select tests.throws('student cannot inspect an illustrative listing',
  $$insert into public.inspection_requests (hostel_id, student_id, preferred_date)
    select id, auth.uid(), current_date + 3 from public.hostels where slug = 'demo-legon-courtyard'$$, '42501');
select tests.throws('student cannot accept own request',
  $$update public.inspection_requests set status = 'accepted'$$, '42501');
select tests.throws('student cannot request for someone else',
  $$insert into public.inspection_requests (hostel_id, student_id, preferred_date)
    select id, '00000000-0000-0000-0000-0000000000b2', current_date + 3 from public.hostels where slug = 'owner-one-hostel'$$);
select tests.act_as('00000000-0000-0000-0000-0000000000a2');
select tests.is('other owner cannot see the request',
  (select count(*) from public.inspection_requests)::int, 0);
select tests.act_as('00000000-0000-0000-0000-0000000000a1');
update public.inspection_requests set status = 'accepted', owner_response = 'See you at 10am';
select tests.is('hostel owner can accept',
  (select status::text from public.inspection_requests limit 1), 'accepted');
select tests.throws('owner cannot rewrite the student message',
  $$update public.inspection_requests set message = 'changed'$$, '42501');
select tests.act_as('00000000-0000-0000-0000-0000000000b1');
update public.inspection_requests set status = 'cancelled';
select tests.is('student can cancel',
  (select status::text from public.inspection_requests limit 1), 'cancelled');

-- Inspection limits (migration 20261023190700)
select tests.reset_role();
insert into public.hostels (slug, name, owner_id, status)
values ('owner-two-hostel', 'Owner Two Hostel', '00000000-0000-0000-0000-0000000000a2', 'published');
update public.business_settings set value = '1' where key = 'inspections.max_open_per_student';
select tests.act_as('00000000-0000-0000-0000-0000000000b2');
insert into public.inspection_requests (hostel_id, student_id, preferred_date)
select id, auth.uid(), current_date + 2 from public.hostels where slug = 'owner-one-hostel';
select tests.throws('one open request per hostel',
  $$insert into public.inspection_requests (hostel_id, student_id, preferred_date)
    select id, auth.uid(), current_date + 4 from public.hostels where slug = 'owner-one-hostel'$$, 'P0001');
select tests.throws('open request limit from business settings',
  $$insert into public.inspection_requests (hostel_id, student_id, preferred_date)
    select id, auth.uid(), current_date + 4 from public.hostels where slug = 'owner-two-hostel'$$, 'P0001');
select tests.throws('room type must belong to the hostel',
  $$insert into public.inspection_requests (hostel_id, student_id, room_type_id, preferred_date)
    select h.id, auth.uid(), r.id, current_date + 4
      from public.hostels h, public.room_types r
      join public.hostels o on o.id = r.hostel_id and o.slug = 'owner-one-hostel'
     where h.slug = 'owner-two-hostel'$$, '22023');
select tests.throws('request date cannot be in the past',
  $$insert into public.inspection_requests (hostel_id, student_id, preferred_date)
    select id, auth.uid(), current_date - 1 from public.hostels where slug = 'owner-two-hostel'$$, '22023');
select tests.reset_role();
update public.business_settings set value = '5' where key = 'inspections.max_open_per_student';
select tests.act_as('00000000-0000-0000-0000-0000000000a1');
select tests.is('owner sees the requesting student''s profile',
  (select full_name from public.profiles where id = '00000000-0000-0000-0000-0000000000b2'), '');
select tests.is('owner sees requesting students only',
  (select count(*) from public.profiles where role = 'student')::int, 2);
select tests.act_as('00000000-0000-0000-0000-0000000000a2');
select tests.is('other owner sees no student profiles',
  (select count(*) from public.profiles where role = 'student')::int, 0);
select tests.reset_role();

-- ---------------------------------------------------------------- photo limits
select tests.act_as('00000000-0000-0000-0000-0000000000a1');
insert into public.hostel_media (hostel_id, storage_path, alt_text, sort_order)
select h.id, 'hostels/' || h.id || '/' || n || '.webp', 'Room photo ' || n, n
  from public.hostels h, generate_series(1, 8) n where h.slug = 'owner-one-hostel';
select tests.is('owner can add photos up to the plan limit',
  (select count(*) from public.hostel_media m join public.hostels h on h.id = m.hostel_id where h.slug = 'owner-one-hostel')::int, 8);
select tests.throws('plan photo limit is enforced',
  $$insert into public.hostel_media (hostel_id, storage_path, alt_text)
    select id, 'hostels/' || id || '/9.webp', 'Room photo 9' from public.hostels where slug = 'owner-one-hostel'$$, 'P0001');
select tests.reset_role();
delete from public.hostel_media m using public.hostels h where h.id = m.hostel_id and h.slug = 'owner-one-hostel' and m.sort_order > 2;

-- ---------------------------------------------------------------- verification
select tests.act_as('00000000-0000-0000-0000-0000000000a1');
insert into public.verification_applications (hostel_id, owner_id, status, owner_note)
select id, auth.uid(), 'approved', 'Deed attached' from public.hostels where slug = 'owner-one-hostel';
select tests.is('application starts pending',
  (select status::text from public.verification_applications limit 1), 'pending');
select tests.throws('owner cannot approve own application',
  $$update public.verification_applications set status = 'approved'$$, '42501');
insert into public.verification_documents (application_id, storage_path, doc_type, file_name)
select id, auth.uid() || '/' || id || '/deed.pdf', 'ownership', 'deed.pdf' from public.verification_applications;
select tests.is('owner can attach a document in their own folder',
  (select count(*) from public.verification_documents)::int, 1);
select tests.throws('documents must live in the owner''s folder',
  $$insert into public.verification_documents (application_id, storage_path, doc_type, file_name)
    select id, '00000000-0000-0000-0000-0000000000a2/' || id || '/x.pdf', 'other', 'x.pdf' from public.verification_applications$$);
select tests.act_as('00000000-0000-0000-0000-0000000000a2');
delete from public.verification_applications;
select tests.act_as('00000000-0000-0000-0000-0000000000a1');
select tests.is('other owner cannot withdraw someone else''s request',
  (select count(*) from public.verification_applications)::int, 1);
select tests.act_as('00000000-0000-0000-0000-0000000000a2');
select tests.throws('owner cannot apply for another owner''s hostel',
  $$insert into public.verification_applications (hostel_id, owner_id)
    select id, auth.uid() from public.hostels where slug = 'owner-one-hostel'$$);
select tests.act_as('00000000-0000-0000-0000-00000000000a');
update public.verification_applications set status = 'approved', reviewer_note = 'Checked';
select tests.reset_role();
select tests.is('approval marks hostel verified',
  (select is_verified from public.hostels where slug = 'owner-one-hostel'), true);
select tests.is('decision is audited',
  (select count(*) from public.audit_log where action = 'verification.decided')::int, 1);
select tests.act_as('00000000-0000-0000-0000-0000000000a1');
delete from public.verification_applications;
select tests.is('owner cannot withdraw a reviewed request',
  (select count(*) from public.verification_applications)::int, 1);
insert into public.verification_applications (hostel_id, owner_id)
select id, auth.uid() from public.hostels where slug = 'owner-one-hostel';
delete from public.verification_applications where status = 'pending';
select tests.is('owner can withdraw an unreviewed request',
  (select count(*) from public.verification_applications)::int, 1);
select tests.reset_role();

-- ---------------------------------------------------------------- storage
select tests.act_as('00000000-0000-0000-0000-0000000000a1');
insert into storage.objects (bucket_id, name)
select 'public-media', 'hostels/' || id || '/photo.webp' from public.hostels where slug = 'owner-one-hostel';
select tests.is('owner can upload to own hostel folder',
  (select count(*) from storage.objects where bucket_id = 'public-media')::int, 1);
insert into storage.objects (bucket_id, name) values ('verification-docs', auth.uid() || '/app/deed.pdf');
select tests.act_as('00000000-0000-0000-0000-0000000000a2');
select tests.throws('other owner cannot upload to that folder',
  $$insert into storage.objects (bucket_id, name)
    select 'public-media', 'hostels/' || id || '/evil.webp' from public.hostels where slug = 'owner-one-hostel'$$);
select tests.throws('owner cannot upload site media',
  $$insert into storage.objects (bucket_id, name) values ('public-media', 'site/logo.webp')$$);
select tests.throws('owner cannot upload into another owner''s document folder',
  $$insert into storage.objects (bucket_id, name) values ('verification-docs', '00000000-0000-0000-0000-0000000000a1/x/y.pdf')$$);
select tests.is('owner cannot read another owner''s documents',
  (select count(*) from storage.objects where bucket_id = 'verification-docs')::int, 0);
select tests.act_as('00000000-0000-0000-0000-0000000000b1');
select tests.throws('student cannot upload verification documents',
  $$insert into storage.objects (bucket_id, name) values ('verification-docs', auth.uid() || '/a/b.pdf')$$);
select tests.act_as('00000000-0000-0000-0000-00000000000a');
select tests.is('admin can read verification documents',
  (select count(*) from storage.objects where bucket_id = 'verification-docs')::int, 1);

-- ---------------------------------------------------------------- CMS
select tests.act_as(null);
select tests.throws('anonymous cannot read drafts',
  $$select 1 / (select count(*) from public.page_section_drafts)$$);
select tests.is('anonymous can read published homepage sections',
  (select count(*) from public.page_sections s join public.pages p on p.id = s.page_id where p.slug = 'home')::int, 7);
select tests.throws('anonymous cannot publish', $$select public.publish_section(gen_random_uuid())$$);
select tests.is('anonymous cannot read private business settings',
  (select count(*) from public.business_settings where key = 'inspections.max_open_per_student')::int, 0);
select tests.is('anonymous cannot read audit log', (select count(*) from public.audit_log)::int, 0);
select tests.act_as('00000000-0000-0000-0000-0000000000b1');
select tests.is('student sees no drafts', (select count(*) from public.page_section_drafts)::int, 0);
select tests.throws('student cannot publish',
  $$select public.publish_section((select id from public.page_sections limit 1))$$, '42501');
select tests.throws('student cannot edit site settings',
  $$update public.site_settings set site_name = 'Hacked' where id = 1 returning 1/0$$);
select tests.act_as('00000000-0000-0000-0000-00000000000a');
update public.page_section_drafts set content = jsonb_set(content, '{heading}', '"New heading"')
 where section_id = (select s.id from public.page_sections s join public.pages p on p.id = s.page_id
                     where p.slug = 'home' and s.key = 'hero');
select tests.act_as(null);
select tests.is('saved draft is not live',
  (select published ->> 'heading' from public.page_sections where key = 'hero'),
  'Find a hostel near campus without the guesswork.');
select tests.act_as('00000000-0000-0000-0000-00000000000a');
select public.publish_section((select id from public.page_sections where key = 'hero'));
select tests.act_as(null);
select tests.is('published draft is live',
  (select published ->> 'heading' from public.page_sections where key = 'hero'), 'New heading');
select tests.act_as('00000000-0000-0000-0000-00000000000a');
select public.restore_revision_to_draft(
  (select min(id) from public.content_revisions where section_id = (select id from public.page_sections where key = 'hero')));
select tests.is('restore copies the revision into the draft',
  (select content ->> 'heading' from public.page_section_drafts
    where section_id = (select id from public.page_sections where key = 'hero')), 'New heading');
select tests.is('admin sees revisions', (select count(*) from public.content_revisions)::int >= 2, true);

-- Site chrome and media: anyone reads what is live, only admins write.
select tests.act_as('00000000-0000-0000-0000-0000000000a1');
select tests.throws('owner cannot add a menu link',
  $$insert into public.navigation_items (location, label, href) values ('header', 'Win', '/x')$$);
select tests.throws('owner cannot add a banner',
  $$insert into public.promo_banners (message, is_active) values ('Free rooms', true)$$);
select tests.throws('owner cannot add a site image',
  $$insert into public.media_assets (external_url, alt_text) values ('https://example.com/a.jpg', 'x')$$);
select tests.throws('owner cannot upload to the site folder',
  $$insert into storage.objects (bucket_id, name) values ('public-media', 'site/x.webp')$$);
select tests.act_as('00000000-0000-0000-0000-00000000000a');
insert into public.promo_banners (message, is_active, starts_at) values ('Later', true, now() + interval '1 day');
insert into public.navigation_items (location, label, href, is_visible) values ('header', 'Hidden link', '/hidden', false);
select tests.throws('menu links reject script URLs',
  $$insert into public.navigation_items (location, label, href) values ('header', 'x', 'javascript:alert(1)')$$);
select tests.act_as(null);
select tests.is('a scheduled banner is not shown yet', (select count(*) from public.promo_banners where message = 'Later')::int, 0);
select tests.is('a hidden menu link is not shown', (select count(*) from public.navigation_items where label = 'Hidden link')::int, 0);

-- ---------------------------------------------------------------- billing
select tests.act_as('00000000-0000-0000-0000-0000000000a1');
select tests.throws('owner cannot record a payment',
  $$insert into public.payments (owner_id, purpose, reference, amount, currency, status)
    values (auth.uid(), 'subscription', 'fake-ref', 150, 'GHS', 'success')$$);
select tests.throws('owner cannot grant themself a subscription',
  $$insert into public.subscriptions (owner_id, plan_id, status, price_amount, currency, plan_name)
    select auth.uid(), id, 'active', 0, 'GHS', name from public.plans where code = 'premium'$$);
update public.plans set price_amount = 0 where code = 'premium';
select tests.throws('owner cannot feature own listing',
  $$insert into public.featured_placements (hostel_id, ends_at)
    select id, now() + interval '7 days' from public.hostels where slug = 'owner-one-hostel'$$);
select tests.act_as(null);
select tests.is('owner could not change plan prices',
  (select price_amount from public.plans where code = 'premium'), 400.00::numeric);
select tests.act_as('00000000-0000-0000-0000-00000000000a');
update public.plans set price_amount = 450 where code = 'premium';
select tests.reset_role();
select tests.is('admin plan change is audited',
  (select count(*) from public.audit_log where entity = 'plans')::int >= 1, true);

-- ---------------------------------------------------------------- payments
select tests.reset_role();
update public.hostels set status = 'published' where slug = 'owner-one-hostel';
select tests.act_as('00000000-0000-0000-0000-0000000000b1');
select tests.throws('student cannot start a payment', $$select * from public.start_payment('subscription', 'standard')$$, '42501');
select tests.act_as('00000000-0000-0000-0000-0000000000a1');
select tests.throws('the free plan needs no payment', $$select * from public.start_payment('subscription', 'free')$$, 'P0001');
select tests.throws('unknown plans are refused', $$select * from public.start_payment('subscription', 'gold')$$, 'P0001');
select tests.is('a plan is priced from the database',
  (select amount from public.start_payment('subscription', 'standard')), 150.00::numeric);
select tests.is('featured weeks are priced from business settings',
  (select amount from public.start_payment('featured_placement', null,
     (select id from public.hostels where slug = 'owner-one-hostel'), 2)), 100::numeric);
select tests.throws('owners cannot feature other owners'' hostels',
  $$select * from public.start_payment('featured_placement', null, (select id from public.hostels where owner_id is null and status = 'published' limit 1), 1)$$);
select tests.throws('owner cannot settle their own payment',
  $$select public.finalize_payment((select reference from public.payments where purpose = 'subscription' limit 1), 'success', 15000, 'GHS', 'ok', '{}')$$, '42501');
select tests.throws('owner cannot use featured weeks without a plan that includes them',
  $$select public.use_featured_slot((select id from public.hostels where slug = 'owner-one-hostel'))$$, 'P0001');

-- The server settles payments with the service role after asking Paystack.
select tests.reset_role();
set role service_role;
select public.finalize_payment((select reference from public.payments where purpose = 'subscription'), 'success', 100, 'GHS', 'ok', '{}') as outcome \gset
reset role;
select tests.is('a short payment is refused', :'outcome'::text, 'mismatch');
select tests.is('a mismatched payment grants nothing',
  (select count(*) from public.subscriptions where owner_id = '00000000-0000-0000-0000-0000000000a1')::int, 0);
select tests.act_as('00000000-0000-0000-0000-0000000000a1');
select reference from public.start_payment('subscription', 'standard') \gset
select tests.reset_role();
set role service_role;
select public.finalize_payment(:'reference', 'success', 15000, 'ghs', 'Approved', '{}') as first_outcome \gset
select public.finalize_payment(:'reference', 'success', 15000, 'GHS', 'Approved', '{}') as second_outcome \gset
reset role;
select tests.is('a full payment settles', :'first_outcome'::text, 'settled');
select tests.is('settling twice changes nothing', :'second_outcome'::text, 'already_settled');
select tests.is('one active subscription', (select count(*) from public.subscriptions
  where owner_id = '00000000-0000-0000-0000-0000000000a1' and status = 'active')::int, 1);
select tests.is('the subscription keeps the price paid', (select price_amount from public.subscriptions
  where owner_id = '00000000-0000-0000-0000-0000000000a1' and status = 'active'), 150.00::numeric);
select tests.is('the plan raises the listing limit', public.owner_listing_limit('00000000-0000-0000-0000-0000000000a1'), 5);
select tests.act_as('00000000-0000-0000-0000-0000000000a1');
select tests.is('owner sees one included featured week', public.my_featured_slots_left(), 1);
select public.use_featured_slot((select id from public.hostels where slug = 'owner-one-hostel'));
select tests.is('the included week is used', public.my_featured_slots_left(), 0);
select tests.throws('it cannot be used twice',
  $$select public.use_featured_slot((select id from public.hostels where slug = 'owner-one-hostel'))$$, 'P0001');
select reference from public.start_payment('featured_placement', null, (select id from public.hostels where slug = 'owner-one-hostel'), 2) \gset
select tests.reset_role();
set role service_role;
select public.finalize_payment(:'reference', 'success', 10000, 'GHS', 'Approved', '{}');
reset role;
select tests.is('paid weeks follow the included week',
  (select max(ends_at) - min(starts_at) from public.featured_placements f join public.hostels h on h.id = f.hostel_id
    where h.slug = 'owner-one-hostel'), interval '21 days');
select tests.act_as('00000000-0000-0000-0000-0000000000a2');
select tests.is('owners see only their own payments',
  (select count(*) from public.payments where owner_id = '00000000-0000-0000-0000-0000000000a1')::int, 0);
select tests.reset_role();

-- ---------------------------------------------------------------- admin user list
select tests.act_as('00000000-0000-0000-0000-00000000000a');
select tests.is('admin lists accounts with emails',
  (select count(*) from public.admin_list_users(null, null, 50, 0) where email like '%@test')::int >= 3, true);
select tests.is('admin search matches email or name',
  (select count(*) from public.admin_list_users('ADMIN@', null, 50, 0))::int, 1);
select tests.is('admin filters by role',
  (select bool_and(role = 'owner') from public.admin_list_users(null, 'owner', 50, 0)), true);
select tests.act_as('00000000-0000-0000-0000-0000000000b1');
select tests.throws('student cannot list accounts', $$select * from public.admin_list_users()$$, '42501');
select tests.act_as(null);
select tests.throws('anonymous cannot list accounts', $$select * from public.admin_list_users()$$);
select tests.reset_role();

-- ---------------------------------------------------------------- ratings
-- student2 has an open (not yet accepted) request for owner-one-hostel.
select tests.act_as('00000000-0000-0000-0000-0000000000b2');
select tests.throws('student cannot rate before the owner accepts',
  $$insert into public.hostel_ratings (hostel_id, student_id, stars)
    select id, auth.uid(), 5 from public.hostels where slug = 'owner-one-hostel'$$, '42501');
select tests.act_as('00000000-0000-0000-0000-0000000000a1');
update public.inspection_requests set status = 'accepted'
 where student_id = '00000000-0000-0000-0000-0000000000b2'
   and hostel_id = (select id from public.hostels where slug = 'owner-one-hostel');
select tests.throws('owner cannot rate their own hostel',
  $$insert into public.hostel_ratings (hostel_id, student_id, stars)
    select id, auth.uid(), 5 from public.hostels where slug = 'owner-one-hostel'$$);
select tests.act_as('00000000-0000-0000-0000-0000000000b2');
insert into public.hostel_ratings (hostel_id, student_id, stars, comment, is_hidden)
select id, auth.uid(), 4, '  Clean rooms, water is steady.  ', true from public.hostels where slug = 'owner-one-hostel';
select tests.is('accepted student can rate, and cannot pre-hide it',
  (select is_hidden from public.hostel_ratings where student_id = auth.uid()), false);
select tests.is('comment is trimmed',
  (select comment from public.hostel_ratings where student_id = auth.uid()), 'Clean rooms, water is steady.');
select tests.is('rollup sets the average',
  (select rating_avg from public.hostels where slug = 'owner-one-hostel'), 4.00::numeric);
select tests.throws('one rating per student per hostel',
  $$insert into public.hostel_ratings (hostel_id, student_id, stars)
    select id, auth.uid(), 2 from public.hostels where slug = 'owner-one-hostel'$$, '23505');
update public.hostel_ratings set stars = 2 where student_id = auth.uid();
select tests.is('student can change their rating',
  (select rating_avg from public.hostels where slug = 'owner-one-hostel'), 2.00::numeric);
select tests.throws('student cannot rate as someone else',
  $$insert into public.hostel_ratings (hostel_id, student_id, stars)
    select id, '00000000-0000-0000-0000-0000000000b1', 5 from public.hostels where slug = 'owner-one-hostel'$$);
select tests.throws('student cannot rate an illustrative listing',
  $$insert into public.hostel_ratings (hostel_id, student_id, stars)
    select id, auth.uid(), 5 from public.hostels where slug = 'demo-legon-courtyard'$$);
select tests.throws('stars stay between 1 and 5',
  $$update public.hostel_ratings set stars = 6 where student_id = auth.uid()$$, '23514');
select tests.act_as('00000000-0000-0000-0000-0000000000b1');
select tests.throws('cancelled request does not allow rating',
  $$insert into public.hostel_ratings (hostel_id, student_id, stars)
    select id, auth.uid(), 5 from public.hostels where slug = 'owner-one-hostel'$$, '42501');
update public.hostel_ratings set stars = 5;
select tests.act_as('00000000-0000-0000-0000-0000000000a1');
update public.hostels set rating_avg = 5, rating_count = 99 where slug = 'owner-one-hostel';
select tests.is('owner cannot overwrite rating rollup',
  (select rating_count from public.hostels where slug = 'owner-one-hostel'), 1);
select tests.act_as('00000000-0000-0000-0000-0000000000b2');
update public.profiles set full_name = 'Ama Kwarteng Boateng' where id = auth.uid();
update public.hostel_ratings set comment = 'Clean rooms.' where student_id = auth.uid();
select tests.act_as(null);
select tests.is('visitors see the rating with first name and initial',
  (select reviewer_name from public.hostel_ratings), 'Ama B.');
select tests.reset_role();
select tests.act_as('00000000-0000-0000-0000-00000000000a');
update public.hostel_ratings set is_hidden = true, hidden_reason = 'Abusive';
select tests.act_as(null);
select tests.is('hidden ratings disappear for visitors',
  (select count(*) from public.hostel_ratings)::int, 0);
select tests.reset_role();
select tests.is('hidden ratings leave the average',
  (select rating_count from public.hostels where slug = 'owner-one-hostel'), 0);
select tests.is('admin hide is audited',
  (select count(*) from public.audit_log where action = 'rating.hidden')::int, 1);
select tests.act_as('00000000-0000-0000-0000-0000000000b2');
update public.hostel_ratings set is_hidden = false;
select tests.reset_role();
select tests.is('student cannot unhide',
  (select is_hidden from public.hostel_ratings), true);

\echo 'All policy tests passed'
