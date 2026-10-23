# StayNest

StayNest helps students find hostels near Ghanaian universities. Students search by campus, price, room size and amenities, then request an inspection before paying anything. Owners list hostels and answer inspection requests. Administrators run the site's content, moderation and plans from the database, with no code changes.

**Stack:** Next.js 16 (App Router, Cache Components), React 19, Tailwind CSS 4, Supabase (Postgres, Auth, Storage, row-level security), Paystack, Netlify.

## Status

| Stage | Scope | State |
| --- | --- | --- |
| 1 | Database, permissions, homepage, search, hostel pages, inspection requests, content pages, pricing, sign-in and sign-up, first dashboards | This branch |
| 2 | Owner listing editor: hostels, rooms and prices, photo uploads, verification documents | Next |
| 3 | Admin console: moderation, verification review, CMS editor with draft, preview, publish and revert, media, site settings, plans | Planned |
| 4 | Paystack subscriptions and featured placements, verified on the server and by webhook | Planned |

## Getting started

```bash
npm ci
cp .env.example .env.local   # fill in the public Supabase URL and anon key
npm run dev
```

### Environment variables

| Name | Where | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser and server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser and server | Supabase anon or publishable key (safe to expose; RLS protects data) |
| `NEXT_PUBLIC_SITE_URL` | Browser and server | Public site URL, used in auth email links |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only** | Admin bootstrap script and, from Stage 4, payment verification |
| `PAYSTACK_SECRET_KEY` | **Server only** | Paystack API calls and webhook signature checks (Stage 4) |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Browser | Paystack checkout (Stage 4) |

Never commit `.env.local`, and never put a server-only value behind a `NEXT_PUBLIC_` name.

## Database

Migrations live in `supabase/migrations` and are applied in filename order. Every table has row-level security; triggers enforce the rules that policies cannot express (owners cannot publish their own listings, students can only cancel their requests, plan listing limits, inspection limits, and so on).

- Apply with the Supabase CLI (`supabase db push`) or paste each file into the SQL editor, in order.
- `supabase/seed/demo_listings.sql` adds six **illustrative** listings. They are marked `is_demo`, labelled "Illustrative" everywhere, cannot be inspected, and use free Unsplash License photos. Remove them with `delete from public.hostels where is_demo;`.
- Starting plan prices (GHS 0, 150, 400 per month) and the featured placement price are placeholders. Change them in the `plans` and `business_settings` tables (an admin screen arrives in Stage 3).
- The terms and privacy pages are starting templates and need legal review before launch.

## First administrator

Admin accounts cannot be created through sign-up. Create the first one from your own machine:

```bash
NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run admin:bootstrap -- --email you@example.com --name "Your Name"
```

If the email has no account, one is created with a random password that is printed once; change it straight away. The script refuses to run when an admin already exists unless you pass `--force`. Admins sign in at `/admin/login`.

## Deploying to Netlify

1. Create a site from this repository. Netlify detects Next.js and uses its runtime; the build command is `npm run build`.
2. Add the environment variables above in **Site configuration → Environment variables**. Mark `SUPABASE_SERVICE_ROLE_KEY` and `PAYSTACK_SECRET_KEY` as secret.
3. In Supabase **Authentication → URL configuration**, set the site URL to your Netlify domain and add `https://<your-domain>/auth/callback` to the redirect URLs.

## Tests

| Command | What it covers |
| --- | --- |
| `npm run typecheck` | TypeScript, including generated route types |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (Vitest): theme contrast, search parsing, redirects, CMS schemas, rich text sanitising, formatting |
| `npm run test:db` | 73 permission tests against every migration on plain PostgreSQL (`PGHOST`, `PGPORT`, `PGUSER` must point at a server) |
| `npm run test:e2e` | Playwright journeys at 1280, 768 and 375 px with axe accessibility checks and screenshots |

The browser tests run against a production build backed by a local stand-in for Supabase: PostgreSQL with all migrations, [PostgREST](https://postgrest.org) at `.tools/postgrest`, and `e2e/support/fake-supabase.mjs`, which implements the few auth endpoints the app uses. Test accounts use the password `Password1234` and exist only in that local database. Set `E2E_BASE_URL` to run the suite against a deployed site instead.

CI (`.github/workflows/ci.yml`) runs all of the above on every pull request.

## Project layout

```
src/app            routes (site pages, auth, dashboards, admin)
src/components     UI, site chrome, hostel and CMS components
src/lib            data access, server actions, validation, auth helpers
supabase/          migrations, seed, permission tests
e2e/               Playwright tests and the local test backend
scripts/           database test runner, e2e database, admin bootstrap
```
