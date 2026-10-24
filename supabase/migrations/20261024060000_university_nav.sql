-- Links the new university pages from the footer. Skipped if an administrator
-- has already added a link to /universities.
insert into public.navigation_items (location, group_label, label, href, sort_order)
select 'footer', 'Students', 'Hostels by university', '/universities', 15
where not exists (select 1 from public.navigation_items where href = '/universities');
