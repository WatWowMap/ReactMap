# Transport Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put live map data back on the 2.0 client: a Golbat client, tRPC for requests, and a socket carrying per-connection deltas.

**Architecture:** ReactMap polls Golbat for Pokémon and subscribes to its webhooks for forts, holds a per-connection map of entity id to change stamp, and sends only differences over one WebSocket. tRPC types and carries everything, with RPC results landing in TanStack Query and delta batches landing in a normalized store that deck.gl reads.

**Tech Stack:** Bun, tRPC v11, TanStack Query, Drizzle, Zustand, deck.gl, `bun test`.

## Where this starts

The server foundation plan is merged. `bun .` starts a Bun.serve process on 8080 serving Better Auth natively, `/api/settings`, `/api/health` and the 2.0 bundle. Express, Apollo, GraphQL and passport are gone from the branch. 306 unit tests and 11 acceptance assertions pass.

There is no map data at all. Deleting the 1.x models took the Golbat client with them, which was correct: 2.0 writes its own. This plan is what makes the map work.

## What validation established, and what it costs us

Three agents read Golbat and PoracleNG in full and returned twenty corrections, recorded in `2026-08-24-upstream-validation-corrections.md` and amended into the transport spec. The findings that shape this plan:

**Golbat cannot be asked what changed.** No incremental query exists anywhere in its codebase. Every poll returns the full matching set and ReactMap works out the difference. We proposed adding one upstream; the design works without it.

**But Golbat can push forts.** Its webhook sender posts decode events to configured URLs, and the fort hook carries an explicit new, removal or edit change type. Those are deltas. They cannot carry Pokémon, because routing is by geofence name rather than viewport, delivery is fire-and-forget with the buffer emptied before the POST, and the stream carries no filter. For forts, which change rarely and never expire, those limits are acceptable against a slow reconciliation poll.

**Results are capped and cannot be raised from the client.** 3,000 Pokémon and 9,000 forts by default. `limit_reached` is the only signal a response was truncated, and reconciliation must never run on one.

**The PvP filter is not a superset.** Golbat collapses every entry to a single best rank per league across all evolutions, so a rule asking for Great rank 100 to 500 is excluded when some evolution ranks better than 100. Any non-1 minimum rank must widen upstream to 1 and compare locally.

**Self-eviction is only safe on verified expiries.** Golbat hands out twenty-minute guesses for unverified spawns and extends them. A client evicting on a guess drops a live entity that the server believes it already delivered, so nothing re-sends it.

## Acceptance criteria

Written first, failing, as the merge gate. The server foundation plan did this and produced zero defects that survived a task, against 27 for the plan before it. Same discipline here.

1. A signed-in client subscribing to a viewport receives an initial set of Pokémon matching its rules.
2. Moving the viewport yields entities for the new area and drops those no longer in it.
3. A Pokémon appearing upstream reaches an already-subscribed client without it asking.
4. A Pokémon with a verified expiry disappears from the client with no server message; one with an unverified expiry does not self-evict.
5. A gym whose raid changes reaches the client from a Golbat webhook, not a poll.
6. A truncated response never causes a live entity to be evicted.
7. Two clients with different rules on the same viewport each receive only what their own rules match.
8. Every response completes; nothing holds a connection open.

## Global Constraints

- Target branch `v2`. The server foundation plan is merged.
- Runtime is Bun. Every command `bun`, never npm or node.
- Tests are `bun test`, currently 306. Acceptance is `bun run test:acceptance`, currently 11 pass and 1 skip.
- Lint is Biome. Never ESLint or Prettier.
- **Server code is TypeScript with ES modules**, the same as the client. Never CommonJS, never plain `.js`. The constraint that once said otherwise was matching `server/src/index.js`, which the cutover deleted. Filenames are kebab-case, components included.
- **Nothing imports, calls or adapts 1.x.** There is no 1.x server code left on this branch, and there is no route back to it. Read git history to learn what it did, then write fresh.
- Golbat is required. `GET /api/status` is read at boot for capabilities and caps.
- Never write the user's name into code, comments, or documentation.
- Commit messages conventional, wrapped at 72 columns, with the `Co-Authored-By` trailer.

---

## Task 1: Acceptance suite, failing

The eight criteria above as an executable suite driving a real server over HTTP and a real socket. Everything red at the end of this task except what the current server already satisfies.

Assert outcomes, never internals. No importing a module to check its return value, no asserting on store contents as a substitute for what a client received. If an assertion could pass while a real user sees a stale map, it is the wrong assertion.

Criterion 5 needs a Golbat webhook, and there is no Golbat here. Decide how to drive it honestly: post a real webhook payload at the endpoint ReactMap exposes, shaped exactly as Golbat's sender produces, and say where you got the shape. Do not stub the thing under test.

## Task 2: Golbat client

A fresh client for the endpoints 2.0 uses: `POST /api/pokemon/v3/scan`, `POST /api/fort/scan`, `GET /api/status`, and the availability endpoints. Read caps and the `fort_in_memory` flag from `/api/status` at boot rather than discovering them by taking a 503.

v3, not the v2 that 1.x called: gender is an array rather than a range, and the response is an envelope carrying `limit_reached`, which the delta design depends on.

## Task 3: Rules to DNF

Translate the rules model into Golbat's filter vocabulary. The shapes are close, and the corrections doc records where they are not: exclusions have no NOT, `pvp_target_species` has no equivalent, and quest conditions, gym badges, EX eligibility and in-battle state are not filterable at all. Those are local post-filters over a narrowed result set.

The PvP widening rule belongs here: a rule with a minimum rank above 1 must ask Golbat for rank 1 and compare locally, or Golbat silently under-returns.

## Task 4: The delta engine

Per connection, a map of entity id to change stamp, and nothing else. Roughly 90 bytes an entity. Compute added, changed and removed against each poll; emit only differences.

Two rules that are not optional. `limit_reached` triggers viewport subdivision and suppresses reconciliation, because dropping what a truncated response omitted evicts live entities. And removal is only inferred client-side for verified expiries.

## Task 5: The socket and tRPC

tRPC v11 with `fetchRequestHandler` on the existing Bun.serve entry, beside `auth.handler`. Subscriptions are async generators over a WebSocket. Session comes from `auth.api.getSession({ headers })` at upgrade, and the 60-second revocation backstop from the transport spec applies here.

## Task 6: Fort webhooks

An endpoint receiving Golbat's webhook POSTs, and the config note operators need. Fort changes push; the fort poll drops to a slow reconciliation cycle that also heals anything a failed delivery lost.

## Task 7: The client store

Delta batches land in a normalized store that deck.gl reads, not in TanStack Query. A query cache would either replace the whole array on every delta or need a hand-written merge; the store is what keeps deck.gl from re-diffing everything. RPC procedures do land in TanStack Query.

## What this deliberately does not do

- No filters UI. Rules come from the database; building them is the next plan.
- No Poracle. Alerts are their own plan, and the corrections doc rewrote what that integration costs.
- No 1.0 routes. `/api/v1`, `/area/*` and the legacy auth paths are not ported.
