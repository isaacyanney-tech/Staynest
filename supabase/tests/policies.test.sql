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

-- ---------------------------------------------------------------- verification
select tests.act_as('00000000-0000-0000-0000-0000000000a1');
insert into public.verification_applications (hostel_id, owner_id, status, owner_note)
select id, auth.uid(), 'approved', 'Deed attached' from public.hostels where slug = 'owner-one-hostel';
select tests.is('application starts pending',
  (select status::text from public.verification_applications limit 1), 'pending');
select tests.throws('owner cannot approve own application',
  $$update public.verification_applications set status = 'approved'$$, '42501');
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
  (select count(*) from public.page_sections s join public.pages p on p.id = s.page_id where p.slug = 'home')::int, 6);
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

\echo 'All policy tests passed'
