-- Illustrative listings for development and launch previews.
-- Every row is is_demo = true: the UI labels them "Illustrative" and they cannot
-- receive inspection requests. Photos are Unsplash License stock images and do
-- not show these (fictional) hostels. Remove from the admin dashboard, or with:
--   delete from public.hostels where is_demo;

with u as (select slug, id from public.universities)
insert into public.hostels (slug, name, summary, description, university_id, address, area, city, distance_km,
                            gender_policy, amenities, house_rules, status, is_demo, published_at)
values
  ('demo-legon-courtyard', 'Legon Courtyard (sample)', 'Quiet two-storey block with a shaded study courtyard, ten minutes on foot from the main gate.',
   'Sample listing. Rooms open onto a central courtyard with study tables and reliable Wi-Fi. Water storage tanks cover the dry season and a caretaker lives on site.',
   (select id from u where slug = 'university-of-ghana'), 'Off Okponglo Road', 'Okponglo', 'Accra', 0.9, 'mixed',
   array['wifi', 'water_storage', 'security', 'study_area', 'kitchen'], 'Quiet hours from 22:00. Visitors leave by 21:00.', 'published', true, now()),
  ('demo-east-legon-heights', 'East Legon Heights (sample)', 'Modern self-contained rooms with private bathrooms and backup power.',
   'Sample listing. Every room has its own bathroom, wardrobe and desk. A generator covers outages and CCTV watches the entrance.',
   (select id from u where slug = 'upsa'), 'Lagos Avenue', 'East Legon', 'Accra', 1.4, 'mixed',
   array['wifi', 'backup_power', 'cctv', 'private_bathroom', 'air_conditioning'], 'No cooking in rooms. Shared kitchen on each floor.', 'published', true, now()),
  ('demo-ayeduase-gardens', 'Ayeduase Gardens (sample)', 'Budget-friendly four-in-a-room option close to the KNUST shuttle stop.',
   'Sample listing. Spacious shared rooms with individual lockers, a laundry area and a study room that stays open late.',
   (select id from u where slug = 'knust'), 'Ayeduase New Site', 'Ayeduase', 'Kumasi', 1.1, 'mixed',
   array['wifi', 'laundry', 'study_area', 'security', 'water_storage'], 'Lockers must be closed when rooms are empty.', 'published', true, now()),
  ('demo-kotei-ladies-lodge', 'Kotei Ladies Lodge (sample)', 'Female-only hostel with a resident warden and secure gated entry.',
   'Sample listing. Two-in-a-room and single rooms, a warden on site, and a fenced compound with one controlled entrance.',
   (select id from u where slug = 'knust'), 'Kotei Junction', 'Kotei', 'Kumasi', 2.3, 'female',
   array['security', 'cctv', 'kitchen', 'water_storage', 'backup_power'], 'Female residents only. Gate closes at 23:00.', 'published', true, now()),
  ('demo-amamoma-view', 'Amamoma View (sample)', 'Hilltop hostel with sea breeze, steps from the UCC science block.',
   'Sample listing. Bright rooms with cross ventilation, a rooftop study deck and a small shop downstairs.',
   (select id from u where slug = 'ucc'), 'Amamoma Hill', 'Amamoma', 'Cape Coast', 0.6, 'mixed',
   array['wifi', 'study_area', 'security', 'kitchen'], 'Keep the rooftop tidy after use.', 'published', true, now()),
  ('demo-madina-commons', 'Madina Commons (sample)', 'Large hostel with a gym and common room on the UPSA and UG trotro routes.',
   'Sample listing. Mixed room sizes, a small gym and a common room with a TV. Short walk to the Madina trotro station.',
   (select id from u where slug = 'upsa'), 'Zongo Junction Road', 'Madina', 'Accra', 3.2, 'mixed',
   array['wifi', 'gym', 'laundry', 'backup_power', 'security'], 'Gym open 05:00 to 22:00.', 'published', true, now())
on conflict (slug) do nothing;

insert into public.room_types (hostel_id, name, occupancy, price_amount, price_period, total_rooms, available_rooms, sort_order)
select h.id, r.name, r.occ, r.price, r.period::public.price_period, r.total, r.avail, r.ord
from public.hostels h
join (values
  ('demo-legon-courtyard', 'Two in a room', 2, 6500, 'academic_year', 20, 6, 1),
  ('demo-legon-courtyard', 'Four in a room', 4, 4200, 'academic_year', 12, 3, 2),
  ('demo-east-legon-heights', 'Single self-contained', 1, 14500, 'academic_year', 15, 2, 1),
  ('demo-east-legon-heights', 'Two in a room, self-contained', 2, 9800, 'academic_year', 18, 5, 2),
  ('demo-ayeduase-gardens', 'Four in a room', 4, 3200, 'academic_year', 30, 11, 1),
  ('demo-ayeduase-gardens', 'Two in a room', 2, 5200, 'academic_year', 16, 0, 2),
  ('demo-kotei-ladies-lodge', 'Single room', 1, 7800, 'academic_year', 10, 1, 1),
  ('demo-kotei-ladies-lodge', 'Two in a room', 2, 5600, 'academic_year', 24, 7, 2),
  ('demo-amamoma-view', 'Two in a room', 2, 2900, 'semester', 22, 9, 1),
  ('demo-amamoma-view', 'Three in a room', 3, 2300, 'semester', 10, 4, 2),
  ('demo-madina-commons', 'Four in a room', 4, 3600, 'academic_year', 40, 14, 1),
  ('demo-madina-commons', 'Two in a room', 2, 6100, 'academic_year', 26, 8, 2),
  ('demo-madina-commons', 'Single room', 1, 9900, 'academic_year', 8, 0, 3)
) as r(slug, name, occ, price, period, total, avail, ord) on r.slug = h.slug
where h.is_demo and not exists (select 1 from public.room_types x where x.hostel_id = h.id);

-- Unsplash License photos (free to use; credit kept as a courtesy).
insert into public.hostel_media (hostel_id, external_url, alt_text, caption, credit, sort_order)
select h.id, m.url, m.alt, null, m.credit, m.ord
from public.hostels h
join (values
  ('demo-legon-courtyard', 'https://images.unsplash.com/photo-1594027554094-99c00129af63', 'Orange multi-storey residence building among green trees', 'Trnava University on Unsplash', 0),
  ('demo-legon-courtyard', 'https://images.unsplash.com/photo-1721743169026-d18a016f8996', 'Bedroom with two bunk beds and a desk', 'Unsplash', 1),
  ('demo-east-legon-heights', 'https://images.unsplash.com/photo-1463620910506-d0458143143e', 'Bright bedroom with a white desk beside the bed', 'Gabriel Beaudry on Unsplash', 0),
  ('demo-east-legon-heights', 'https://images.unsplash.com/photo-1786282820018-a55c823838a3', 'Modern apartment building with bicycle racks in front', 'Help Stay on Unsplash', 1),
  ('demo-ayeduase-gardens', 'https://images.unsplash.com/photo-1781415980730-bfcf192e38bc', 'Clean, well-lit room with several neatly made beds', 'Loyd Benedict Benedicto on Unsplash', 0),
  ('demo-ayeduase-gardens', 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5', 'Black metal bunk bed in a shared room', 'Unsplash', 1),
  ('demo-kotei-ladies-lodge', 'https://images.unsplash.com/photo-1721743169043-dda0212ce3d4', 'Bedroom with bunk beds and a rug on the floor', 'Unsplash', 0),
  ('demo-amamoma-view', 'https://images.unsplash.com/photo-1767884162402-683fdd430046', 'Row of bunk beds in a dormitory room', 'Adem Percem on Unsplash', 0),
  ('demo-madina-commons', 'https://images.unsplash.com/photo-1786282820018-a55c823838a3', 'Modern apartment building with bicycle racks in front', 'Help Stay on Unsplash', 0),
  ('demo-madina-commons', 'https://images.unsplash.com/photo-1781415980730-bfcf192e38bc', 'Shared room with several neatly made beds', 'Loyd Benedict Benedicto on Unsplash', 1)
) as m(slug, url, alt, credit, ord) on m.slug = h.slug
where h.is_demo and not exists (select 1 from public.hostel_media x where x.hostel_id = h.id);
