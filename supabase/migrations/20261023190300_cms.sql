-- StayNest: database-backed content management.
-- Public pages read page_sections.published; admins edit page_section_drafts and
-- publish through publish_section(), which snapshots a revision every time.

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  bucket text not null default 'public-media',
  storage_path text,
  external_url text,
  alt_text text not null default '' check (char_length(alt_text) <= 200),
  caption text check (caption is null or char_length(caption) <= 200),
  credit text check (credit is null or char_length(credit) <= 200),
  mime_type text,
  size_bytes int,
  width int,
  height int,
  is_illustrative boolean not null default false,
  status text not null default 'active' check (status in ('active', 'inactive')),
  sort_order int not null default 0,
  uploaded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint media_assets_source check ((storage_path is not null) <> (external_url is not null))
);

create table public.site_settings (
  id int primary key default 1 check (id = 1),
  site_name text not null default 'StayNest' check (char_length(site_name) between 2 and 60),
  tagline text not null default '',
  logo_media_id uuid references public.media_assets (id) on delete set null,
  favicon_media_id uuid references public.media_assets (id) on delete set null,
  -- Brand colours chosen from an approved set of token values (validated in the app).
  theme jsonb not null default '{}'::jsonb,
  contact jsonb not null default '{}'::jsonb,
  social jsonb not null default '{}'::jsonb,
  seo jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

create trigger site_settings_touch before update on public.site_settings
  for each row execute function public.touch_updated_at();

create table public.pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 2 and 120),
  seo_title text check (seo_title is null or char_length(seo_title) <= 70),
  seo_description text check (seo_description is null or char_length(seo_description) <= 170),
  is_published boolean not null default false,
  is_system boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

create trigger pages_touch before update on public.pages
  for each row execute function public.touch_updated_at();

create table public.page_sections (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages (id) on delete cascade,
  key text not null check (key ~ '^[a-z0-9_-]+$'),
  type text not null check (type in (
    'hero', 'search_intro', 'featured_hostels', 'popular_universities', 'how_it_works',
    'trust', 'about', 'cta', 'faq', 'rich_text', 'contact', 'footer'
  )),
  label text not null,
  sort_order int not null default 0,
  is_visible boolean not null default true,
  published jsonb,
  published_at timestamptz,
  published_by uuid references auth.users (id) on delete set null,
  unique (page_id, key)
);

create table public.page_section_drafts (
  section_id uuid primary key references public.page_sections (id) on delete cascade,
  content jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

create table public.content_revisions (
  id bigint generated always as identity primary key,
  section_id uuid not null references public.page_sections (id) on delete cascade,
  content jsonb not null,
  action text not null check (action in ('publish', 'unpublish', 'revert')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index content_revisions_section_idx on public.content_revisions (section_id, created_at desc);

create table public.navigation_items (
  id uuid primary key default gen_random_uuid(),
  location text not null check (location in ('header', 'footer')),
  group_label text,
  label text not null check (char_length(label) between 1 and 40),
  -- Internal paths or https links only; no javascript: or data: URLs.
  href text not null check (href ~ '^(/[A-Za-z0-9/_?=&#.-]*|https://[^\s]+)$'),
  sort_order int not null default 0,
  is_visible boolean not null default true
);

create table public.promo_banners (
  id uuid primary key default gen_random_uuid(),
  message text not null check (char_length(message) between 3 and 160),
  link_label text,
  link_href text check (link_href is null or link_href ~ '^(/[A-Za-z0-9/_?=&#.-]*|https://[^\s]+)$'),
  tone text not null default 'info' check (tone in ('info', 'promo', 'notice')),
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default false,
  sort_order int not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

-- ------------------------------------------------------------------
-- Publishing workflow (admin only, security definer with explicit checks)
-- ------------------------------------------------------------------

create or replace function public.publish_section(p_section uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  draft jsonb;
  stamp timestamptz := now();
begin
  if not public.is_admin() then
    raise exception 'Administrators only' using errcode = '42501';
  end if;
  select d.content into draft from public.page_section_drafts d where d.section_id = p_section;
  if draft is null then
    raise exception 'Nothing to publish: this section has no draft' using errcode = 'P0002';
  end if;
  update public.page_sections
     set published = draft, published_at = stamp, published_by = auth.uid()
   where id = p_section;
  insert into public.content_revisions (section_id, content, action, created_by)
  values (p_section, draft, 'publish', auth.uid());
  perform public.write_audit('content.published', 'page_sections', p_section::text, '{}'::jsonb);
  return stamp;
end;
$$;

create or replace function public.unpublish_section(p_section uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_content jsonb;
begin
  if not public.is_admin() then
    raise exception 'Administrators only' using errcode = '42501';
  end if;
  select published into current_content from public.page_sections where id = p_section;
  update public.page_sections
     set published = null, published_at = now(), published_by = auth.uid()
   where id = p_section;
  if current_content is not null then
    insert into public.content_revisions (section_id, content, action, created_by)
    values (p_section, current_content, 'unpublish', auth.uid());
  end if;
  perform public.write_audit('content.unpublished', 'page_sections', p_section::text, '{}'::jsonb);
end;
$$;

-- Copies an old revision back into the draft. The admin then previews and publishes.
create or replace function public.restore_revision_to_draft(p_revision bigint)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  rev record;
begin
  if not public.is_admin() then
    raise exception 'Administrators only' using errcode = '42501';
  end if;
  select * into rev from public.content_revisions where id = p_revision;
  if rev is null then
    raise exception 'Revision not found' using errcode = 'P0002';
  end if;
  insert into public.page_section_drafts (section_id, content, updated_at, updated_by)
  values (rev.section_id, rev.content, now(), auth.uid())
  on conflict (section_id) do update
    set content = excluded.content, updated_at = excluded.updated_at, updated_by = excluded.updated_by;
  insert into public.content_revisions (section_id, content, action, created_by)
  values (rev.section_id, rev.content, 'revert', auth.uid());
  perform public.write_audit('content.reverted', 'page_sections', rev.section_id::text,
    jsonb_build_object('revision', p_revision));
  return rev.section_id;
end;
$$;

revoke execute on function public.publish_section(uuid) from public, anon;
revoke execute on function public.unpublish_section(uuid) from public, anon;
revoke execute on function public.restore_revision_to_draft(bigint) from public, anon;
grant execute on function public.publish_section(uuid) to authenticated;
grant execute on function public.unpublish_section(uuid) to authenticated;
grant execute on function public.restore_revision_to_draft(bigint) to authenticated;

create trigger site_settings_audit after update on public.site_settings
  for each row execute function public.audit_admin_change();
create trigger navigation_items_audit after insert or update or delete on public.navigation_items
  for each row execute function public.audit_admin_change();
create trigger promo_banners_audit after insert or update or delete on public.promo_banners
  for each row execute function public.audit_admin_change();
create trigger pages_audit after insert or update or delete on public.pages
  for each row execute function public.audit_admin_change();
create trigger media_assets_audit after insert or update or delete on public.media_assets
  for each row execute function public.audit_admin_change();

-- ------------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------------

alter table public.media_assets enable row level security;
alter table public.site_settings enable row level security;
alter table public.pages enable row level security;
alter table public.page_sections enable row level security;
alter table public.page_section_drafts enable row level security;
alter table public.content_revisions enable row level security;
alter table public.navigation_items enable row level security;
alter table public.promo_banners enable row level security;

create policy "media assets: public read active" on public.media_assets for select using (status = 'active');
create policy "media assets: admin all" on public.media_assets for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "site settings: public read" on public.site_settings for select using (true);
create policy "site settings: admin update" on public.site_settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "pages: public read published" on public.pages for select using (is_published);
create policy "pages: admin all" on public.pages for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "sections: public read published" on public.page_sections for select
  using (is_visible and published is not null
         and exists (select 1 from public.pages p where p.id = page_id and p.is_published));
create policy "sections: admin all" on public.page_sections for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "drafts: admin all" on public.page_section_drafts for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "revisions: admin read" on public.content_revisions for select to authenticated
  using (public.is_admin());

create policy "nav: public read visible" on public.navigation_items for select using (is_visible);
create policy "nav: admin all" on public.navigation_items for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "banners: public read live" on public.promo_banners for select
  using (is_active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now()));
create policy "banners: admin all" on public.promo_banners for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

revoke insert, update, delete on public.content_revisions from anon, authenticated;
