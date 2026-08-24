# Postmark City

A mobile-first digital mail app built around a huge interactive virtual map. Every
account gets a permanent digital address inside a procedurally generated miniature
city, and every envelope you send makes the full postal journey — sender's mailbox →
delivery truck → the Central Postal Factory → a different exit on the opposite side →
recipient's mailbox — never a direct hop.

## Stack

- React + TypeScript + Vite
- Zustand for state, persisted to `localStorage` (acts as the "backend" for this
  client-only build — see below)
- Hand-rolled SVG map renderer with pan/zoom/pinch camera control (no map SDK)
- No routing library — four tabs (Map / Mail / Inbox / Profile) with the map always
  mounted underneath as the persistent "home" surface

## Running it

```bash
npm install
npm run dev
```

## How the world is built

`src/world/generateWorld.ts` deterministically generates a 13×13 grid of city blocks
(houses, apartment towers, shops, parks, and one giant factory dead center) from a
seeded PRNG, so the same map exists on every load. `src/world/routing.ts` builds
truck routes that always follow the street grid and always pass through the factory's
south entrance and north exit — see `engine/deliveryEngine.ts` for the state machine
(`CREATED → PICKUP → TO_FACTORY → PROCESSING → LEAVING_FACTORY → TO_RECIPIENT →
DELIVERED`), which is driven by wall-clock timestamps rather than a running timer, so
an in-flight delivery correctly fast-forwards to the right state if the app was closed
and reopened mid-delivery.

## Persistence model

This is a single-device demo: your account, its address, sent/received envelopes, and
~40 seeded NPC neighbors all live in `localStorage`. There's no server, so mail can be
sent *to* NPCs (and you'll see the full truck animation), but they won't write back.
Swapping in a real backend would mean replacing `src/store/persist.ts` and the
`sendEnvelope`/`tick` actions in `src/store/useStore.ts` with API calls — the delivery
state machine and map/animation layers don't need to change.
