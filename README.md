# Postmark City

A mobile-first digital mail app built around a huge interactive virtual map. Every
account gets a permanent digital address inside a procedurally generated miniature
city, and every envelope you send makes the full postal journey — sender's mailbox →
delivery truck → the Central Postal Factory → a different exit on the opposite side →
recipient's mailbox — never a direct hop.

## Stack

- React + TypeScript + Vite
- **Supabase** (Postgres + anonymous auth + realtime) as the backend — no server to
  write or run
- Zustand for client state
- Hand-rolled SVG map renderer with pan/zoom/pinch camera control (no map SDK)
- No routing library — four tabs (Map / Mail / Inbox / Profile) with the map always
  mounted underneath as the persistent "home" surface

## Setup

1. Create a free project at [supabase.com](https://supabase.com).
2. Open the SQL Editor and run `supabase/schema.sql`, then `supabase/seed.sql` (the
   seed populates ~40 "neighbor" profiles so the map and search aren't empty before
   real people sign up).
3. Under **Authentication → Sign In / Providers**, enable **Anonymous Sign-Ins** —
   that's how each visitor gets an account without a signup form.
4. Copy your Project URL and anon public key from **Project Settings → API**.
5. Copy `.env.example` to `.env` and fill in `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY`. When deploying (e.g. on Vercel), set the same two
   variables under Project Settings → Environment Variables instead.

```bash
npm install
npm run dev
```

If the env vars are missing or a query fails (e.g. the schema wasn't run yet), the
app shows an in-app setup screen with these same steps instead of crashing.

## How the world is built

`src/world/generateWorld.ts` deterministically generates a 13×13 grid of city blocks
(houses, apartment towers, shops, parks, and one giant factory dead center) from a
seeded PRNG, so the same map exists on every load, for every visitor. Addresses are
just IDs into this generated grid (`b-<row>-<col>-h<n>`) — the database only ever
stores which address a profile occupies, never the map itself.

## How delivery state works

`src/engine/deliveryEngine.ts` derives an envelope's delivery status
(`PICKUP → TO_FACTORY → PROCESSING → LEAVING_FACTORY → TO_RECIPIENT → DELIVERED`)
purely from its `created_at` timestamp and the (deterministic) route distance —
nothing about status is ever written to the database. That means it's automatically
consistent for every device watching the same row, and an in-flight delivery
"resumes" correctly at the right point if you close the tab and come back, with no
extra bookkeeping. `src/world/routing.ts` builds the actual truck paths, which always
follow the street grid and always pass through the factory's south entrance and north
exit — never a direct sender-to-recipient hop.

## Data model

- `profiles` — one row per account: `id` (matches the Supabase auth user id for real
  visitors; a random id for seeded NPC neighbors), `username`, `address_id`,
  `is_npc`. Publicly readable (it's the directory search reads from), but you can
  only insert your own row.
- `envelopes` — `sender_id`, `recipient_id`, `message`, `style`, `gift`,
  `image_data_url`, `created_at`, `read`. Row-level security restricts reads/writes
  to the two people involved. New mail for your address pushes to open clients over
  Supabase Realtime.

NPC neighbors never send mail back — they exist so the map and search have people in
them before your friends sign up. Everything else (sending, the delivery animation,
receiving, notifications) works between real accounts exactly as it does with NPCs.
