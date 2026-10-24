# StayNest

StayNest helps students find hostels near Ghanaian universities. Students search by campus, price, room size and amenities, then request an inspection before paying anything. Owners list hostels and answer inspection requests. Administrators run the site's content, moderation and plans from the database, with no code changes.

**Stack:** Next.js 16 (App Router, Cache Components), React 19, Tailwind CSS 4, Supabase (Postgres, Auth, Storage, row-level security), Paystack, Netlify.

## Status

| Stage | Scope | State |
| --- | --- | --- |
| 1 | Database, permissions, homepage, search, hostel pages, inspection requests, content pages, pricing, sign-in and sign-up, first dashboards | Done |
| 2 | Owner listing editor: hostels, rooms and prices, photo uploads, verification documents, replies to inspection requests | Done |
| 3 | Admin console: moderation, verification review, CMS editor with draft, preview, publish and revert, media, site settings, plans | Done |
| 4 | Paystack plan payments and featured placements, verified on the server and by webhook | This branch |

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
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only** | Admin bootstrap script and recording verified payments |
| `PAYSTACK_SECRET_KEY` | **Server only** | Paystack API calls and webhook signature checks. Without it (or the service-role key) payment buttons are hidden |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Browser | Not needed by the current redirect checkout; kept for a future inline checkout |

Never commit `.env.local`, and never put a server-only value behind a `NEXT_PUBLIC_` name.

## Owner uploads

Photos and verification documents are checked on the server by their contents, not their names. Photos must be JPEG, PNG, WebP or AVIF, up to 8 MB and at least 400 × 300 pixels; they are re-encoded to WebP at most 2000 px wide, which also removes location and camera metadata. Documents may be PDF or images up to 10 MB, are stored in the private `verification-docs` bucket, readable only by the owner who sent them and by admins. Each plan's photo limit is enforced by the database.

## Database

Migrations live in `supabase/migrations` and are applied in filename order. Every table has row-level security; triggers enforce the rules that policies cannot express (owners cannot publish their own listings, students can only cancel their requests, plan listing limits, inspection limits, and so on).

- Apply with the Supabase CLI (`supabase db push`) or paste each file into the SQL editor, in order.
- `supabase/seed/demo_listings.sql` adds six **illustrative** listings. They are marked `is_demo`, labelled "Illustrative" everywhere, cannot be inspected, and use free Unsplash License photos. Remove them with `delete from public.hostels where is_demo;`.
- Starting plan prices (GHS 0, 150, 400 per month) and the featured placement price are placeholders. Change them under Plans and prices and Business settings in the admin console.
- The terms and privacy pages are starting templates and need legal review before launch.

## First administrator

Admin accounts cannot be created through sign-up. Create the first one from your own machine:

```bash
NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run admin:bootstrap -- --email you@example.com --name "Your Name"
```

If the email has no account, one is created with a random password that is printed once; change it straight away. The script refuses to run when an admin already exists unless you pass `--force`. Admins sign in at `/admin/login`.

## Admin console

Everything lives under `/admin` and needs an administrator account. Each action is checked again by row-level security, and moderation, access, price, setting and publishing changes are written to the activity log.

- **Listings**: approve submitted listings, send them back with a note the owner sees, or suspend a live one.
- **Verification**: open the owner's documents through links that expire after 10 minutes, then approve, ask for more or reject. Approving adds the verified badge.
- **People**: change an account's role or suspend it. You cannot change your own access.
- **Payments**: every checkout with its status; unfinished ones can be checked with Paystack again.
- **Plans and prices**, **Business settings**: values the site reads at run time. Existing subscriptions keep the price they were sold at.
- **Pages and content**: every editable section of the homepage, content pages and footer. Edits are saved as drafts, can be previewed at `/admin/preview/<page>`, and only go live on **Save and publish**. Each publish keeps a version you can restore. Sections can be hidden or reordered, and pages have their own search title and description.
- **Media library**: images for site pages. Uploads need a description and a confirmation that the image may be used, can be labelled illustrative, and are re-encoded to WebP. An image still used by a page cannot be deleted.
- **Site and navigation**: name, logo, colours (from a set that keeps text readable), contact details, social links, search defaults, header and footer links, and a scheduled announcement banner.

## Payments

Owners pay on Paystack's own checkout page; the site never sees card or mobile money details.

1. **Start.** The owner picks a plan or a number of featured weeks on `/dashboard/owner/billing`. The server action calls `start_payment()`, which reads the price from the `plans` table or the `featured.price_per_week` setting and records a pending payment with a fresh reference. Nothing price-related is read from the form.
2. **Checkout.** The server opens a Paystack transaction for that reference and amount and sends the owner to Paystack.
3. **Confirm.** Paystack sends the owner back to `/dashboard/owner/billing/callback` and also calls `/api/paystack/webhook`. The webhook must carry a valid `x-paystack-signature` (HMAC-SHA512 of the body with the secret key). In both cases the server asks Paystack's API for the transaction itself, then calls `finalize_payment()` with the service role.
4. **Grant once.** `finalize_payment()` locks the payment row, checks the amount and currency against what was priced in step 1, and grants the purchase only on the first success. A mismatch marks the payment failed and writes it to the activity log.

Plans never renew automatically: each payment covers one billing period, paying again for the same plan extends it, and choosing another plan starts that plan today. Each period's included featured weeks can be used from the billing page. Administrators see every payment under **Admin → Payments** and can ask Paystack again about one that stays unfinished.

**Set up:** in the Paystack dashboard under **Settings → API Keys & Webhooks**, set the webhook URL to `https://<your-domain>/api/paystack/webhook`.

## Deploying to Netlify

1. Create a site from this repository. Netlify detects Next.js and uses its runtime; the build command is `npm run build`.
2. Add the environment variables above in **Site configuration → Environment variables**. Mark `SUPABASE_SERVICE_ROLE_KEY` and `PAYSTACK_SECRET_KEY` as secret.
3. In Supabase **Authentication → URL configuration**, set the site URL to your Netlify domain and add `https://<your-domain>/auth/callback` to the redirect URLs.

## Tests

| Command | What it covers |
| --- | --- |
| `npm run typecheck` | TypeScript, including generated route types |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (Vitest): theme contrast, search parsing, redirects, CMS and listing schemas, rich text sanitising, formatting, upload checks |
| `npm run test:db` | 112 permission and payment tests against every migration on plain PostgreSQL (`PGHOST`, `PGPORT`, `PGUSER` must point at a server) |
| `npm run test:e2e` | Playwright journeys at 1280, 768 and 375 px with axe accessibility checks and screenshots |

The browser tests run against a production build backed by a local stand-in for Supabase: PostgreSQL with all migrations, [PostgREST](https://postgrest.org) at `.tools/postgrest`, and `e2e/support/fake-supabase.mjs`, which implements the few auth endpoints the app uses and keeps uploaded files on disk while checking each upload and delete against the real storage policies. Payments go to `e2e/support/fake-paystack.mjs`, which serves a test checkout page and answers the verify endpoint like Paystack. Test accounts use the password `Password1234` and exist only in that local database. Set `E2E_BASE_URL` to run the suite against a deployed site instead.

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
