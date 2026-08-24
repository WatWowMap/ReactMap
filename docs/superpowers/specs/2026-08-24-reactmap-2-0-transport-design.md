# ReactMap 2.0: the transport

## Scope

How the 2.0 client and server talk to each other, and how the server talks to Golbat. Covers the
wire protocol, the API layer, authentication, and the shape of what replaces GraphQL. Does not
cover the rules model, which is settled in
`2026-08-24-reactmap-2-0-rules-model-design.md`, or the client shape, settled in
`2026-08-23-reactmap-2-0-client-shape-design.md`.

## What this replaces

Everything in `server/src/graphql/`: 56 queries, 11 mutations, no subscriptions. Apollo Server on
the way out, Apollo Client with it.

The 1.x model is polling. `src/hooks/useMapData.js:18-30` starts an hourly poll for the `available`
query; per-entity layers refetch on a timer and again on every map `fetchdata` event
(`src/pages/map/components/QueryData.jsx:164-197`). Defaults are 20s for pokemon, 10s for gyms and
devices and scan cells, 30s for weather. Map layers run `fetchPolicy: 'no-cache'`, so Apollo's
normalized cache is carried and never used.

It also replaces the dual data path. Every map model today calls Golbat and falls back to direct
SQL when Golbat is absent or answers badly: `server/src/models/Pokemon.js:138` branches on
`if (!mem)`, and Gym, Pokestop and Station each log `falling back to SQL for this source`
(`Gym.js:534`, `Pokestop.js:922`, `Station.js:863`). That fallback is why every filter has to be
implemented twice, once in Golbat's filter vocabulary and once in Knex.

## The shape

One Bun process. `Bun.serve` owns the port.

```
Bun.serve({
  fetch: (req) => {
    if (isAuthPath(req))  return auth.handler(req)          // Better Auth
    if (isTrpcPath(req))  return fetchRequestHandler({ ... }) // tRPC
    return staticAssets(req)
  },
  websocket: { ... },                                       // native, tRPC subscriptions ride here
})
```

Express goes. Nothing adapts anything: Better Auth's `auth.handler` and tRPC's
`fetchRequestHandler` both take a `Request` and return a `Response`, which is already
`Bun.serve`'s signature.

tRPC types and carries every call, but the results land in two different places.

**RPC procedures land in TanStack Query.** Ask, cache, invalidate. This is the conventional and
well-trodden path and it needs no special handling.

**The delta subscription lands in a normalized entity store**, which deck.gl reads. It does not go
through TanStack Query. A query cache stores results keyed by query key, and a delta stream is not
a result, it is a set that keeps changing. Putting it in a cache leaves two options, both bad:
replace the whole array on each delta, so every entity re-renders, or merge by hand with
`setQueryData`, which is a store with extra ceremony. deck.gl does not re-render through React
anyway. It diffs attribute arrays, so what matters is not handing it a new array identity for a
change that touched one entity.

Subscriptions are async generators. tRPC v11 deprecated observables.

The v11 docs recommend Server-Sent Events over WebSocket as the default for subscriptions. We go
the other way. SSE is unidirectional, and this client talks constantly: viewport changes, rule
edits, subscription changes. SSE would mean a stream plus a stream of POSTs beside it. One socket
is better on mobile and it is the connection reuse we are after.

## The delta protocol

The server holds, per connection, a map from entity id to a change stamp. It never holds the
entities. It already has the full entity in hand from Golbat when it builds a message, and
afterwards it only needs enough to answer whether something is new, changed, or gone.

That costs about 90 bytes per tracked entity: roughly 40 for the map entry, 40 for a 20 character
id, 8 for the stamp. A dense urban viewport of 5,000 entities is about 500 KB per connection, a
typical viewport nearer 100 KB, and 200 concurrent connections about 20 MB.

Golbat's 11 GB is not a comparison. Golbat holds full entities for the whole world because it is
the source of truth. This holds ids for what one person is looking at.

State is session scoped and trimmed by expiry. There is no tile cache and no eviction policy. An
earlier draft proposed a tile LRU, which turned out to be guarding about 100 KB per connection.

Pokemon carry an expiry timestamp, so the client evicts despawns on its own clock without being
told. Removes are only sent for three cases: the entity left the viewport, a rule change stopped
matching it, or a fort's state changed out of the filter.

## Golbat

2.0 requires the Huma API and `fort_in_memory = true`. The fort scan endpoints return 503 when that
flag is off, and `config.toml.example:9` marks it experimental. The direct-SQL path is deleted, not
made conditional.

1.x already calls this API. `Pokemon.js:259` posts `/api/pokemon/v2/scan`; Gym, Pokestop and Station
post their own `/scan` endpoints and share one `/api/fort/available`. Requiring it is not a version
bump so much as removing the second implementation of everything.

**Golbat cannot push.** No WebSocket server, no SSE, no gRPC streaming. Both `.proto` files declare
unary RPCs only. Every apparent websocket hit in that repo is inside the generated
`pogo/vbase.pb.go` and refers to Niantic's own message names. The one push-shaped feature is
webhooks-out, whose consumer list is read once at `main.go:82` from `config.toml`, with no runtime
registration and no live reload. ReactMap owns the push layer.

Upstream is assumed cheap. ReactMap and Golbat normally share an internal network. Two consequences.

We ask Golbat for the superset and post-filter locally wherever its filter language cannot express
a rule. Its filters are DNF, an OR of AND'd clauses, with no NOT, so `rule_exclusion` cannot be
expressed at all, and `pvp_target_species` has no equivalent. Asking broadly and dropping rows
locally gives the same answer with far less translation logic.

There is no upstream coalescing. Two users looking at the same block cause two polls. This removes
a shared-cache subsystem that would otherwise need writing.

Some operator will run Golbat across the internet. The design assumes cheap upstream without
depending on it, and coalescing stays addable later.

What does translate upstream is most of the rules model, because Golbat's vocabulary and ours are
close to the same thing. Its pokemon filter takes `pokemon: [{id, form}]` pairs plus ranges for iv,
atk, def, sta, level, cp, size and the three PvP leagues, plus a gender array. That `{id, form}`
pair is the singular rule row from the rules spec. Forts filter on raid level, raid boss, team,
open slots, lure, quest reward, incident character, contest and station battle.

Golbat has no nest data. `decoder/geography.go` uses a nest tree for geofence labelling only.
Nests stay ReactMap's own.

## Auth

Better Auth replaces passport and express-session.

```
betterAuth({
  database: drizzleAdapter(db, { provider: 'mysql' }),
  emailAndPassword: { enabled: true },
  socialProviders: { discord: { clientId, clientSecret } },
})
```

Local auth stops being a passport strategy and becomes a first-class mode. Discord is a built-in
provider. `auth.api.getSession({ headers })` reads a session from raw headers, which is the shape a
WebSocket upgrade hands you.

Sessions become rows rather than a blob in a cookie. That is what makes revocation reach an open
socket at all. Today `serializeUser` bakes the whole user object, perms included, into the session,
so a long-lived connection would hold a snapshot from connect time and never learn an entitlement
was withdrawn.

**Telegram is the gap.** It is not a built-in provider and it is not in the `genericOAuth` preset
list, because the Telegram Login Widget is not OAuth2. It is an HMAC-SHA256 payload signed with the
bot token and verified server side. 1.x reaches for `@rainb0w-clwn/passport-telegram-official` for
the same reason. This needs a custom plugin whichever library we pick.

### Migration

The current user table is one wide row: `id`, `username`, `password`, `discordId`, `telegramId`,
`discordPerms`, `telegramPerms`, `strategy`, `webhookStrategy`, `selectedWebhook`, `tutorial`,
`useAppShell`, `data`.

It fans out. One `user` row, one `account` row per linked identity with `providerId` of `discord`,
`telegram` or `credential`, and perms move to a ReactMap-owned table keyed by user id.

Three things need care. There is no email column today and Better Auth's `user.email` is not null
and unique, so the username plugin carries local auth instead. The local password moves from the
user row to `account.password` intact, or people are locked out. And `discordId` and `telegramId`
stop being columns.

This resolves an older tension. Per-strategy perms columns plus a `strategy` column naming the live
one encodes "a user has one identity" into the schema, while the `link_discord_telegram` migration
from 2021 exists to break exactly that assumption. Account rows model multiple identities natively.

### Revocation

Push, with a 60 second backstop.

An entitlement or perms write invalidates that user's open sockets in process, so the normal case
is immediate. The timer covers two gaps only: a socket on one process when the write lands on
another, and a session revoked from a different device.

This follows 1.x, which is already push based for Discord. Perms update when the gateway sends a
member update event. `sessionCheckIntervalMs` of 900000 is express-mysql-session sweeping expired
rows, not a perms refresh.

`trust proxy` is set. It is configured nowhere in the Express app today, so behind the reverse
proxy that is the normal deployment, anything IP-derived currently reads the proxy's address.

## The RPC surface

Map entities move to the delta subscription: pokemon, gyms, pokestops, stations, nests, tappables,
weather, spawnpoints, portals, s2cells, scan cells, submission cells, routes and devices.

Everything else becomes tRPC procedures, roughly sixty of them: the search family, geocoder,
backups, the Poracle webhook family, locales, badges, `validateUser`, `checkUsername`, `motdCheck`,
`pokemonShinyStats`, the scan area queries, and the by-id lookups behind each entity.

Scan-on-demand survives, Dragonite only. `scannerApi.js` currently branches three ways across RDM,
Dragonite and custom, including RDM basic auth and `set_data` URL construction. The RDM and custom
backends go with the rest of the RDM removal, leaving one code path behind `scanner`,
`scannerConfig`, `checkValidScan` and `devices`.

The 16 pre-built Pokestop query documents go, along with the 4 each for Gym and Pokemon. 1.x
generates every combination of optional fragment groups and picks one at request time
(`src/services/queries/index.js:39-101`) to avoid over-fetching. The idea is right and survives; the
104 hand-maintained documents do not. The client declares what it needs once, at subscribe time.

Watch tRPC's type inference. A router of about sixty procedures carrying fat entity types is
exactly where it gets slow, and slow means the editor rather than the build. Split sub-routers and
put explicit return types on the fat procedures from the first commit, not as a later rescue.

## Reducing what we send

Measured today, ordered by size.

**The masterfile stops being sent.** Today it is 831,799 bytes shipped whole to every client, the
`pokemon` key alone accounting for 436,079 of that, going out through the `available` query as
`masterfile: JSON` (`server/src/graphql/resolvers.js:40`, `typeDefs/map.graphql:2`). Being a
response body rather than an asset, the browser cannot cache it, and an hourly poll re-sends it.
This is the largest single item in the system and it is not map data.

2.0 keeps the whole masterfile on the server and sends only the fragments a client actually
references. See "The masterfile" below.

**Deltas instead of full viewports.** Steady state on a still map falls to near zero.

**Field selection**, declared once at subscribe time rather than by choosing among 104 documents.

**`__typename` on every entity of every response.** Apollo adds it by default and 1.x never
overrides it. We simply do not add it.

Encoding stays JSON. Binary is worth perhaps 20 to 30 percent on top of the four wins above, and
none of those wins depend on it. The contracts package keeps the door open to measure later.

Responses are gzipped today via the `compression` package. Requests are never compressed.

## The masterfile

`pogo-masterfile` is the runtime package and `pogo-masterfile-types` the generated types. The
server holds one `Masterfile` instance and answers for fragments; the client never sees the whole
thing.

```ts
const mf = await Masterfile.fromRemote()   // DEFAULT_MASTERFILE_URL, alexelgt/game_masters
mf.pokemon.get(templateId)                 // literal-typed, returns the exact entry
mf.pokemon.filter(predicate)               // per-group accessors, plus find/has/all/templateIds
await mf.refresh()                         // re-fetch in place on a game update
```

The upstream GAME_MASTER is 8,608,587 bytes across 18,239 entries, roughly ten times the derived
file 1.x ships, so serving fragments is not an optimization here. It is the only option.

**Entries are keyed by template id, not by numeric id.** They look like
`EXTENDED_V0001_POKEMON_BULBASAUR_FALL_2019`: the species number is embedded but the form is a
name, while ReactMap and Golbat both speak numeric `form_id`. So the server builds an index once at
boot, mapping `${species_id}-${form_id}` to its entry, which is the same key scheme the rules model
and Poracle already use. This is the part of `packages/masterfile` that survives. It does not
disappear, it moves behind the index.

Fragments are pulled, not pushed. The delta stream carries entity ids; when a batch names a species
the client has no entry for, it asks for the missing ones in one batched procedure. Masterfile data
is immutable within a game version, so those results cache indefinitely under a key carrying the
masterfile version, which is exactly what TanStack Query is for. Pushing fragments alongside deltas
would save a round trip and lose the caching, which is the wrong trade on a page that reloads.

**Use the widened types at the tRPC boundary.** `pogo-masterfile-types` exports two tiers per group
and the choice between them matters here. `<Group>Lookup` is a literal table mapping every template
id to its own narrow entry type, so `get` on a known id returns that entry rather than a union.
`<Group>Type` is `W<<Group>>`, where `W` recursively turns literals into primitives and tuples into
arrays (`dist/_utils.d.ts`).

The literal tier is worth having in server-side code. It is a liability in a procedure's inferred
return type: the lookup tables carry 13,775 keys in total, `pokemon-settings` alone accounting for
2,468, across a 14 MB `dist`. A ~60 procedure router pulling that into its inference is the
tsserver slowdown this spec already warns about, arriving from a second direction. Procedures
return the `W`-widened `<Group>Type`; anything wanting the narrow type keeps it behind the server
boundary.

Zod exports are not needed. The fragments we send are server-produced and therefore trusted, so
there is nothing for a client-side schema to check. The boundary that does take untrusted input is
`fromRemote`, parsing a third-party URL, and that already has `MasterfileParseError` inside the
library.

## Deferred

- Binary or positional encoding for entity batches. Revisit with a measurement, not an argument.
- Upstream coalescing across connections looking at the same area.
- Registering ReactMap as a Golbat webhook consumer. It would need an operator config edit and a
  Golbat restart, it delivers decode events rather than viewport queries, and it would still leave
  browser fan-out to us.

## Decisions and their reasoning

| Decision | Why |
|---|---|
| Per-connection deltas | Optimizes the expensive link. Golbat is on the LAN, the browser is on mobile data. |
| Ids and a stamp, never entities | The entity is already in hand when the message is built. Storing it again buys nothing and costs two orders of magnitude. |
| Session scoped, no tile LRU | The LRU was guarding about 100 KB per connection. |
| Full Bun.serve | Better Auth and tRPC are both `Request` to `Response`. There is nothing left for Express to do. |
| Better Auth over hand-rolled | Same signature, a Drizzle adapter for MySQL, Discord built in, and sessions as rows so revocation works. |
| tRPC everywhere, two sinks | One type system. Only the destination differs, because a delta stream is not a cacheable result. |
| WebSocket over SSE | SSE is unidirectional and this client talks constantly. |
| JSON for now | The top wins are not sending things at all. Encoding is a multiplier on what remains. |
| Superset upstream, filter locally | DNF has no NOT, and upstream bytes are free. |
| Dragonite-only scan-on-demand | Keeps a live feature while removing the RDM-shaped code the release exists to delete. |

## For planning

- Whether `customComponent` and `saveComponent` survive. Plan 1 removed the `.custom.jsx` build
  plugin, but both resolvers are still present at `resolvers.js:138` and `resolvers.js:805`. Confirm
  before porting either.
- The exact delta message shape, including how a batch identifies its category and whether a resync
  is a distinct message type or an empty prior state.
- Whether the entity store is one store keyed by category or one per category. The
  `zustand-subscription-patterns` guidance argues for subscribing in the consuming component, which
  points at per-category, but the map has one consumer.
- What the client sends on reconnect. Full resync is simplest and probably right, but it is worth
  pricing against a resume token.
- Indexes for the perms table, once its shape is settled alongside the entitlement API.
- Which masterfile groups the client actually needs fragments from. Pokemon, moves, items and
  invasions are certain; the rest of the 18,239 entries are probably server-only.
- Whether the `${species_id}-${form_id}` index is built eagerly at boot or lazily per group. Eager
  is simpler and the cost is paid once, but it wants measuring against the 8.6 MB parse.
- Whether Poracle's move to a single provider on its own page changes the webhook procedure surface
  or only its client routing.
