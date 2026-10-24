-- Accounts and one real (non-demo) listing for browser tests. Applied only to
-- the local end-to-end database, never to Supabase.
insert into auth.users (id, email, raw_user_meta_data) values
  ('e2e00000-0000-4000-8000-000000000001', 'student@e2e.test', '{"full_name":"Ama Mensah"}'),
  ('e2e00000-0000-4000-8000-000000000002', 'owner@e2e.test', '{"full_name":"Kofi Owusu","role":"owner"}'),
  ('e2e00000-0000-4000-8000-000000000003', 'admin@e2e.test', '{"full_name":"Esi Admin"}'),
  ('e2e00000-0000-4000-8000-000000000004', 'new.owner@e2e.test', '{"full_name":"Yaa Asante","role":"owner"}'),
  ('e2e00000-0000-4000-8000-000000000005', 'student2@e2e.test', '{"full_name":"Kwame Adjei"}');
update public.profiles set role = 'admin' where id = 'e2e00000-0000-4000-8000-000000000003';

insert into public.hostels (id, slug, name, summary, description, owner_id, university_id, address, area, city, distance_km,
                            gender_policy, amenities, house_rules, status, is_verified, published_at, contact_phone)
select 'e2e10000-0000-4000-8000-000000000001', 'okponglo-test-house', 'Okponglo Test House',
       'A real listing used by browser tests.', 'Two blocks with **reliable water** and a study room.',
       'e2e00000-0000-4000-8000-000000000002', u.id, '12 Test Street', 'Okponglo', 'Accra', 0.7,
       'mixed', array['wifi', 'water_storage', 'security'], 'No loud music after 22:00.', 'published', true, now(), '+233 20 000 0000'
from public.universities u where u.slug = 'university-of-ghana';

insert into public.room_types (hostel_id, name, occupancy, price_amount, price_period, total_rooms, available_rooms, sort_order)
values ('e2e10000-0000-4000-8000-000000000001', 'Two in a room', 2, 5800, 'academic_year', 10, 4, 1);

-- An open request for the owner to answer.
update public.profiles set phone = '+233 24 555 0101' where id = 'e2e00000-0000-4000-8000-000000000005';
insert into public.inspection_requests (hostel_id, student_id, preferred_date, preferred_time, message)
values ('e2e10000-0000-4000-8000-000000000001', 'e2e00000-0000-4000-8000-000000000005', current_date + 3, 'morning', 'Can I see a room with a balcony?');

-- Work waiting for an administrator: two submitted listings and a
-- verification request with one document.
insert into auth.users (id, email, raw_user_meta_data) values
  ('e2e00000-0000-4000-8000-000000000006', 'review.owner@e2e.test', '{"full_name":"Abena Boateng","role":"owner"}');
update public.profiles set phone = '+233 27 555 0202' where id = 'e2e00000-0000-4000-8000-000000000006';

insert into public.hostels (id, slug, name, summary, description, owner_id, university_id, address, area, city, distance_km,
                            gender_policy, amenities, house_rules, status)
select v.id::uuid, v.slug, v.name, v.summary, 'Rooms around a shaded courtyard.', 'e2e00000-0000-4000-8000-000000000006', u.id,
       '4 Review Road', v.area, 'Kumasi', 1.2, 'mixed', array['wifi', 'security'], '', 'pending_review'
from public.universities u,
     (values ('e2e10000-0000-4000-8000-000000000002', 'kotei-review-lodge', 'Kotei Review Lodge', 'Quiet rooms ten minutes from campus.', 'Kotei'),
             ('e2e10000-0000-4000-8000-000000000003', 'bomso-review-hostel', 'Bomso Review Hostel', '', 'Bomso')) as v(id, slug, name, summary, area)
where u.slug = 'knust';

insert into public.room_types (hostel_id, name, occupancy, price_amount, price_period, total_rooms, available_rooms, sort_order)
values ('e2e10000-0000-4000-8000-000000000002', 'Single room', 1, 7200, 'academic_year', 6, 6, 1);

insert into public.verification_applications (id, hostel_id, owner_id, owner_note)
values ('e2e20000-0000-4000-8000-000000000001', 'e2e10000-0000-4000-8000-000000000002', 'e2e00000-0000-4000-8000-000000000006',
        'Land title is in my name.');
insert into storage.objects (bucket_id, name, owner)
values ('verification-docs', 'e2e00000-0000-4000-8000-000000000006/e2e20000-0000-4000-8000-000000000001/title.pdf', 'e2e00000-0000-4000-8000-000000000006');
insert into public.verification_documents (application_id, storage_path, doc_type, file_name)
values ('e2e20000-0000-4000-8000-000000000001', 'e2e00000-0000-4000-8000-000000000006/e2e20000-0000-4000-8000-000000000001/title.pdf',
        'ownership', 'land-title.pdf');

-- An owner with one published listing, for payment tests.
insert into auth.users (id, email, raw_user_meta_data) values
  ('e2e00000-0000-4000-8000-000000000007', 'billing.owner@e2e.test', '{"full_name":"Efua Darko","role":"owner"}');
insert into public.hostels (id, slug, name, summary, description, owner_id, university_id, address, area, city, distance_km,
                            gender_policy, amenities, house_rules, status, is_verified, published_at, contact_phone)
select 'e2e10000-0000-4000-8000-000000000004', 'ayeduase-billing-house', 'Ayeduase Billing House',
       'A published listing used by payment tests.', 'Rooms close to the Ayeduase gate.',
       'e2e00000-0000-4000-8000-000000000007', u.id, '4 Gate Road', 'Ayeduase', 'Kumasi', 1.1,
       'mixed', array['wifi'], '', 'published', false, now(), '+233 20 000 0004'
from public.universities u where u.slug = 'knust';
insert into public.room_types (hostel_id, name, occupancy, price_amount, price_period, total_rooms, available_rooms, sort_order)
values ('e2e10000-0000-4000-8000-000000000004', 'Single room', 1, 6400, 'academic_year', 6, 2, 1);

-- A student whose inspection the owner accepted, so they may rate the hostel.
insert into auth.users (id, email, raw_user_meta_data) values
  ('e2e00000-0000-4000-8000-000000000008', 'rater@e2e.test', '{"full_name":"Akosua Serwaa Frimpong"}');
insert into public.inspection_requests (hostel_id, student_id, preferred_date, preferred_time, status, owner_response)
values ('e2e10000-0000-4000-8000-000000000001', 'e2e00000-0000-4000-8000-000000000008', current_date + 1, 'afternoon', 'accepted', 'Come at 2pm.');
