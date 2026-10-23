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
