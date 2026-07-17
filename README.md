# BusConnect Web

Passenger-facing frontend for **BusConnect** — a modern Sri Lanka bus-booking
platform. Stack: **Next.js 16 (App Router) + Supabase (auth + direct catalog
reads) + BusConnect-api (NestJS, for money/seat writes)**. See
[`../docs/PRODUCT_AND_TECH_PLAN.md`](../docs/PRODUCT_AND_TECH_PLAN.md) for the
full plan.

## Read/write split (why some data comes from Supabase, some from the API)

Per the plan's architecture (§4.2): this app reads **public catalog data**
(locations, routes, trips) directly from Supabase under RLS — see
`src/lib/locations.ts`. Anything involving **money or seats** goes through
`BusConnect-api` — see `src/lib/api.ts` (`createHold`, `createBooking`,
`checkoutBooking`). Auth is Supabase's; the API verifies the same JWT.

## What's here (Phase 1)

- **Auth** — phone OTP sign-in (`/login`), session cookies managed by
  `middleware.ts` + `src/lib/supabase/{client,server,middleware}.ts`
  (the standard `@supabase/ssr` pattern). Protects `/bookings/*`.
- **Search** — home page (`/`) loads the location catalog from Supabase and
  renders a from/to/date form; `/search` calls `BusConnect-api`'s
  `GET /search` and lists matching trips.
- **API client** (`src/lib/api.ts`) — typed wrapper for every BusConnect-api
  endpoint, public and authenticated.

## Setup

```bash
npm install
# .env.local already has NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
# set NEXT_PUBLIC_API_BASE_URL if BusConnect-api isn't on http://localhost:3000/api

npm run dev          # http://localhost:3000
```

> The home page needs the `locations` table, and `/login` needs phone OTP
> enabled (Authentication → Providers → Phone, with an SMS provider like
> Twilio) in the Supabase project. Until then, both degrade gracefully
> (empty search / OTP send error) rather than crashing.
>
> Apply `BusConnect-api/supabase/migrations/*.sql` to this Supabase project
> to populate the catalog — see `BusConnect-api/README.md`.

## Scripts

| command | what |
|---|---|
| `npm run dev` | dev server (Turbopack) |
| `npm run build` | production build + typecheck |
| `npm run lint` | ESLint |

## Next

- Trip detail + live seat map page (`/trips/:id`) with Realtime seat updates.
- Booking + PayHere checkout redirect flow (`/bookings/:id`).
- si/ta i18n; operator dashboard section.
