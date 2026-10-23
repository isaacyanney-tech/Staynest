-- StayNest: initial site content, plans and reference data.
-- Everything here is editable from the admin dashboard afterwards.

insert into public.site_settings (id, site_name, tagline, theme, contact, social, seo)
values (
  1,
  'StayNest',
  'Find a student hostel you can trust.',
  '{"primary": "#173B57", "secondary": "#18A999"}',
  '{"email": "hello@staynest.example", "phone": "", "address": "Accra, Ghana", "hours": "Mon to Fri, 9:00 to 17:00"}',
  '{"instagram": "", "x": "", "facebook": "", "tiktok": ""}',
  '{"title": "StayNest | Student hostels near your campus", "description": "Compare verified student hostels near Ghanaian universities. See real prices, rooms and photos, then book an inspection."}'
)
on conflict (id) do nothing;

insert into public.pages (slug, title, seo_title, seo_description, is_published, is_system) values
  ('home', 'Homepage', null, null, true, true),
  ('global', 'Site-wide content', null, null, true, true),
  ('about', 'About StayNest', 'About StayNest', 'Why StayNest exists and how we check hostels.', true, true),
  ('faq', 'Frequently asked questions', 'FAQ | StayNest', 'Answers about searching, inspections, verification and listing a hostel.', true, true),
  ('contact', 'Contact us', 'Contact StayNest', 'Get in touch with the StayNest team.', true, true),
  ('safety', 'Safety', 'Safety on StayNest', 'How to inspect and pay for a hostel safely.', true, true),
  ('terms', 'Terms and conditions', 'Terms | StayNest', 'The terms for using StayNest.', true, true),
  ('privacy', 'Privacy policy', 'Privacy | StayNest', 'How StayNest handles your personal data.', true, true)
on conflict (slug) do nothing;

-- Helper for this migration only: add a section with identical draft and published content.
create function pg_temp.add_section(p_page text, p_key text, p_type text, p_label text, p_order int, p_content jsonb)
returns void language plpgsql as $$
declare
  sid uuid;
begin
  insert into public.page_sections (page_id, key, type, label, sort_order, published, published_at)
  select id, p_key, p_type, p_label, p_order, p_content, now() from public.pages where slug = p_page
  on conflict (page_id, key) do nothing
  returning id into sid;
  if sid is not null then
    insert into public.page_section_drafts (section_id, content) values (sid, p_content);
  end if;
end $$;

select pg_temp.add_section('home', 'hero', 'hero', 'Hero', 10, $json${
  "eyebrow": "Student housing, checked",
  "heading": "Find a hostel near campus without the guesswork.",
  "subheading": "Compare rooms, prices and real photos from hostels around your university, then book an inspection before you pay anything.",
  "searchPlaceholder": "Search by hostel, area or university",
  "primaryCta": {"label": "Browse hostels", "href": "/hostels"},
  "secondaryCta": {"label": "List your hostel", "href": "/sign-up?role=owner"},
  "mediaId": null,
  "stats": [
    {"value": "", "label": "Prices shown up front"},
    {"value": "", "label": "Inspections before payment"}
  ]
}$json$);

select pg_temp.add_section('home', 'universities', 'popular_universities', 'Popular universities', 20, $json${
  "heading": "Start from your campus",
  "subheading": "Hostels are grouped by the university they serve, with walking distance on every listing.",
  "universitySlugs": []
}$json$);

select pg_temp.add_section('home', 'featured', 'featured_hostels', 'Featured hostels', 30, $json${
  "heading": "Hostels with rooms available now",
  "subheading": "Listings with current prices and open rooms.",
  "hostelSlugs": [],
  "limit": 6
}$json$);

select pg_temp.add_section('home', 'how', 'how_it_works', 'How it works', 40, $json${
  "heading": "How StayNest works",
  "steps": [
    {"title": "Search near your campus", "body": "Filter by university, budget, room size and amenities. Every listing shows its price per academic year or semester."},
    {"title": "Book an inspection", "body": "Pick a date and the hostel owner confirms or suggests another time. You see the room before you commit."},
    {"title": "Move in with confidence", "body": "Verified hostels have had ownership documents checked by our team. Pay the hostel directly once you are satisfied."}
  ]
}$json$);

select pg_temp.add_section('home', 'trust', 'trust', 'Trust and safety', 50, $json${
  "heading": "What the verified badge means",
  "body": "A hostel is marked verified only after the owner submits ownership and identity documents and a StayNest reviewer approves them.",
  "points": [
    {"title": "Documents reviewed", "body": "Proof of ownership or management rights, and the owner's identity."},
    {"title": "Listings moderated", "body": "New listings are reviewed before they appear in search."},
    {"title": "Never pay before you inspect", "body": "StayNest will never ask you to send money to secure a room you have not seen."}
  ],
  "link": {"label": "Read our safety guide", "href": "/safety"}
}$json$);

select pg_temp.add_section('home', 'owners', 'cta', 'Owner call to action', 60, $json${
  "heading": "Own or manage a hostel?",
  "body": "List your rooms, keep prices current, and answer inspection requests from one dashboard.",
  "cta": {"label": "Create an owner account", "href": "/sign-up?role=owner"}
}$json$);

select pg_temp.add_section('global', 'footer', 'footer', 'Footer', 10, $json${
  "blurb": "StayNest helps students find safe, fairly priced hostels near Ghanaian universities.",
  "legal": "StayNest lists hostels run by independent owners. Always inspect a room before paying."
}$json$);

select pg_temp.add_section('about', 'body', 'rich_text', 'About', 10, $json${
  "heading": "About StayNest",
  "body": "StayNest started with a simple problem: finding a decent hostel near campus means walking from gate to gate, asking about prices that change by the hour.\n\nWe put hostels, rooms and prices in one place so students can compare before they travel, and so owners can fill rooms without middlemen.\n\n## How we check listings\n\n- Every new listing is reviewed by our team before it appears in search.\n- Owners can apply for verification by submitting ownership and identity documents.\n- Students can report a listing that does not match reality, and we follow up."
}$json$);

select pg_temp.add_section('faq', 'questions', 'faq', 'Questions', 10, $json${
  "heading": "Frequently asked questions",
  "items": [
    {"q": "Does StayNest charge students?", "a": "No. Searching, saving hostels and booking inspections are free for students."},
    {"q": "How do inspections work?", "a": "Choose a date on the hostel page. The owner accepts it or proposes another time, and you can track the request in your dashboard."},
    {"q": "What does verified mean?", "a": "The owner has submitted ownership and identity documents, and a StayNest reviewer has approved them."},
    {"q": "How do I list my hostel?", "a": "Create an owner account, add your hostel, rooms and photos, then submit it for review."},
    {"q": "Some photos say Illustrative. Why?", "a": "Listings marked Illustrative are sample content used while StayNest launches. They are not real hostels and cannot be booked."}
  ]
}$json$);

select pg_temp.add_section('contact', 'body', 'contact', 'Contact', 10, $json${
  "heading": "Talk to the StayNest team",
  "body": "Questions about a listing, your account or verification? Reach us using the details below and we will reply within two working days."
}$json$);

select pg_temp.add_section('safety', 'body', 'rich_text', 'Safety guide', 10, $json${
  "heading": "Staying safe when you rent",
  "body": "## Before you pay\n\n- Inspect the room in person, or send someone you trust.\n- Confirm the price, what it includes, and the payment schedule in writing.\n- Pay the hostel, not a third party, and get a receipt.\n\n## Red flags\n\n- Pressure to pay a deposit before an inspection.\n- A price far below other hostels in the same area.\n- Contact details that do not match the listing.\n\nIf something feels wrong, report the listing to us."
}$json$);

select pg_temp.add_section('terms', 'body', 'rich_text', 'Terms', 10, $json${
  "heading": "Terms and conditions",
  "body": "These terms are a starting template and must be reviewed by a qualified lawyer before launch.\n\n## Using StayNest\n\nStayNest is a listing service. Hostels are operated by independent owners, who are responsible for the accuracy of their listings and for any agreement you make with them.\n\n## Accounts\n\nKeep your login details private. We may suspend accounts that post misleading listings or misuse the service."
}$json$);

select pg_temp.add_section('privacy', 'body', 'rich_text', 'Privacy', 10, $json${
  "heading": "Privacy policy",
  "body": "This policy is a starting template and must be reviewed before launch.\n\n## What we collect\n\n- Account details: your name, email and phone number.\n- Inspection requests and saved hostels.\n- For owners, verification documents, which only you and StayNest reviewers can access.\n\n## How we use it\n\nWe use your data to run the service, connect students with hostel owners, and keep the platform safe. We do not sell personal data."
}$json$);

insert into public.navigation_items (location, group_label, label, href, sort_order) values
  ('header', null, 'Find a hostel', '/hostels', 10),
  ('header', null, 'How it works', '/#how-it-works', 20),
  ('header', null, 'For owners', '/sign-up?role=owner', 30),
  ('footer', 'Students', 'Browse hostels', '/hostels', 10),
  ('footer', 'Students', 'Safety guide', '/safety', 20),
  ('footer', 'Students', 'FAQ', '/faq', 30),
  ('footer', 'Owners', 'List your hostel', '/sign-up?role=owner', 10),
  ('footer', 'Owners', 'Plans and pricing', '/pricing', 20),
  ('footer', 'StayNest', 'About', '/about', 10),
  ('footer', 'StayNest', 'Contact', '/contact', 20),
  ('footer', 'StayNest', 'Terms', '/terms', 30),
  ('footer', 'StayNest', 'Privacy', '/privacy', 40);

-- Starting plans. Prices are placeholders for the administrator to confirm.
insert into public.plans (code, name, description, price_amount, currency, billing_interval, listing_limit, featured_slots, photo_limit, features, is_default, sort_order) values
  ('free', 'Starter', 'One listing to get started.', 0, 'GHS', 'month', 1, 0, 8,
    array['1 hostel listing', 'Up to 8 photos', 'Inspection requests'], true, 10),
  ('standard', 'Standard', 'For owners with a few properties.', 150, 'GHS', 'month', 5, 1, 20,
    array['Up to 5 hostel listings', 'Up to 20 photos per hostel', '1 featured placement each month'], false, 20),
  ('premium', 'Premium', 'For managers with larger portfolios.', 400, 'GHS', 'month', null, 3, 40,
    array['Unlimited hostel listings', 'Up to 40 photos per hostel', '3 featured placements each month'], false, 30)
on conflict (code) do nothing;

insert into public.business_settings (key, value, label, description, is_public) values
  ('featured.homepage_slots', '6', 'Featured hostels on the homepage', 'How many featured hostels the homepage shows at most.', true),
  ('featured.price_per_week', '50', 'Featured placement price per week (GHS)', 'What an owner pays to feature one hostel for one week.', true),
  ('inspections.max_open_per_student', '5', 'Open inspection requests per student', 'How many requested or accepted inspections one student may have at once.', false)
on conflict (key) do nothing;

-- Universities served at launch (reference data, not listings).
insert into public.universities (slug, name, short_name, city, region, description, is_popular, sort_order) values
  ('university-of-ghana', 'University of Ghana', 'UG', 'Legon, Accra', 'Greater Accra', 'Hostels around Legon, East Legon, Madina and Okponglo.', true, 10),
  ('knust', 'Kwame Nkrumah University of Science and Technology', 'KNUST', 'Kumasi', 'Ashanti', 'Hostels around Ayeduase, Kotei, Bomso and Ayigya.', true, 20),
  ('ucc', 'University of Cape Coast', 'UCC', 'Cape Coast', 'Central', 'Hostels around Amamoma, Kwaprow and Apewosika.', true, 30),
  ('upsa', 'University of Professional Studies, Accra', 'UPSA', 'East Legon, Accra', 'Greater Accra', 'Hostels around East Legon, Madina and Adenta.', true, 40),
  ('gimpa', 'Ghana Institute of Management and Public Administration', 'GIMPA', 'Achimota, Accra', 'Greater Accra', 'Hostels around Greenhill, Achimota and Dome.', false, 50),
  ('uew', 'University of Education, Winneba', 'UEW', 'Winneba', 'Central', 'Hostels around North and South campus.', false, 60),
  ('uds', 'University for Development Studies', 'UDS', 'Tamale', 'Northern', 'Hostels around the Tamale and Nyankpala campuses.', false, 70),
  ('umat', 'University of Mines and Technology', 'UMaT', 'Tarkwa', 'Western', 'Hostels around the Tarkwa campus.', false, 80)
on conflict (slug) do nothing;
