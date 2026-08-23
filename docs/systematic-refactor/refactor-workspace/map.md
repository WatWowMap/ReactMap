# Refactor Map

Phase 4 — the primary deliverable. Written against `90f94e63`.

Every leaf carries `← was <old path>`, an **Action**, and a note saying what changes and why.
Actions: `port` · `port + rename` · `port + redesign` · `split` · `merge` · `rewrite` · `drop` ·
`replace-with-lib` · `keep (untouched)` · `promote`.

**Directory names are proposals, not decisions.** The mapping is the deliverable; rename freely.

---

## Shape of the target

Three tiers, because the assessment's verdict tally splits three ways and a single strategy
serves none of them well:

- **`app/`** — greenfield TypeScript client. New code, no 1.0 lineage to preserve, ships behind
  a per-user flag alongside `src/` until parity.
- **`services/mapd/`** — greenfield data service. Golbat consumer, live spatial index, WebSocket
  fan-out. Has no 1.0 equivalent to port, which is the only honest case for "from scratch".
- **`server/`** — the existing Node server, strangled down to auth, identity, permissions,
  config, the Poracle bridge, the admin API, and the new rules storage. Kept because its value
  is accumulated behaviour, not code.

Holding them together: **`packages/contracts/`**, the one new shared package. Both new tiers and
the old server code against it, which is what makes coexistence work instead of forking reality.

---

## New Structure

```
packages/
  contracts/                                    ← new package, no old equivalent
    wire/
      envelope.ts
        Action: write fresh
        Notes: the WebSocket frame — {t: 'add'|'update'|'remove'|'snapshot'|'error', cat, seq, payload}.
               Sequence numbers so a client can detect a gap and ask for a resnapshot. This type is
               the contract that lets app/ and services/mapd/ be written by different people, and
               later by a different language, without a shared codebase.
      entities.ts
        ← was server/src/graphql/typeDefs/{map,scanner}.graphql
        Action: port + redesign
        Notes: the extract-before-delete step. Those three .graphql files are the only complete
               inventory of what flows over the wire, and no flow trace ever opened them. Port
               each type to a TS interface here BEFORE deleting the schema, or the deletion loses
               the only spec that exists.
      rules.ts
        ← was server/src/filters/pokemon/Frontend.js (shape only)
        Action: rewrite
        Notes: the rule model — Rule{scope, conditions[], display}, Condition{field, min, max}.
               Shared by the editor in app/, the evaluator in server/, and the reverse index in
               services/mapd/. One definition, three consumers; this is what stops the three
               drifting the way client and server filter shapes drift today.
    golbat/
      client.ts
        ← was server/src/utils/fetchJson.js + the mem-branches scattered through models
        Action: rewrite
        Notes: generated from Golbat's /openapi.json rather than hand-written, so the contract
               stops living in comments. Today it lives in prose like "endpoint↔SQL parity" notes
               inside Pokestop.js.
      capability.ts
        ← was server/src/services/DbManager.js:schemaCheck
        Action: port + redesign
        Notes: schemaCheck does not vanish, it moves. Same job — "what can this backend do" — but
               asking GET /api/status over a documented contract instead of introspecting columns
               in someone else's database. 15 of the 20 capability flags disappear here; the four
               that survive (hasPokemonBackground, hasPokemonShinyStats, hasShortcode, polygon)
               do so because the underlying thing is genuinely missing, not merely unprobed.

  types/
    ← was packages/types
    Action: keep + evolve
    Notes: scanner.d.ts (44 commits) and server.d.ts (43) are both hot and neither was opened by
           any flow trace. This is already the closest thing to a schema the repo has and it is
           honestly derived from runtime shapes. Migrate the parts that describe the wire into
           contracts/; keep the rest.

  config/
    schema.ts
      ← was config/default.json + config/custom-environment-variables.json
      Action: rewrite
      Notes: 3,574 lines defining 611 keys collapses to a schema with defaults beside the types.
             authentication.perms becomes Record<PermName, PermConfig> — 87 leaves become one type
             plus 29 names. Serves G10; also gives boot errors that name the offending field
             instead of getSafe throwing on a path.
    env.ts
      ← was config/custom-environment-variables.json (all 2,465 lines)
      Action: replace-with-lib
      Notes: a generic RM__A__B__C → a.b.c resolver, roughly twenty lines. The hand-mirrored file
             and the .configref drift-guard both stop existing because there is nothing to drift.
    migrations.ts
      ← was packages/config/lib/mutations.js
      Action: port + redesign
      Notes: 381 lines of load-time migration. Read it before replacing — it encodes which config
             shapes real deployments still have in the wild, which nothing else records.
    multiDomain.ts
      ← was packages/config/lib/index.js:getMapConfig/getAreas
      Action: port
      Notes: keep per-host skinning. Stop implying tenancy — it does not scope auth or permissions,
             and a schema rewrite that silently drops the host keying breaks every multi-host install.

  locales/ · masterfile/ · logger/
    Action: keep (untouched)
    Notes: all three are fine. masterfile changes how it is delivered (hashed static asset with an
           ETag rather than a GraphQL field) but not what it is.

  vite-plugins/
    customFile.ts
      ← was packages/vite-plugins/lib/customFile.js
      Action: keep (decision required)
      Notes: any Foo.custom.jsx silently replaces Foo.jsx at build time, with only a build warning.
             That is a real extensibility contract operators depend on, and a TS restructure breaks
             every existing override with no compiler signal. Keep it, or announce removal — do not
             lose it by omission.

services/
  mapd/                                         ← new service, no old equivalent
    golbat/
      poller.*
        ← was the mem-branches in server/src/models/{Gym,Pokemon,Pokestop,Station}.js:getAll
        Action: promote
        Notes: NOT new work. Commit a9daf360 (2026-07-29) already ships DNF-filtered fort scanning
               against Golbat, with SQL as the fallback. This lifts the existing endpoint path out
               and makes it the only path.
      webhookReceiver.*
        ← new, no old equivalent
        Action: write fresh
        Notes: Golbat already batches webhooks on a 1s flush across pokemon/gym/raid/pokestop/quest/
               invasion/weather/fort_update/max_battle. Consuming that is what turns 10–20s polling
               into ~1s push, and it needs no Golbat changes at all — which makes it the cheapest
               half of G3.
    index/
      spatial.*
        ← new
        Action: write fresh
        Notes: live viewport index. Golbat has its own rtree but ReactMap needs per-connection
               viewport tracking to compute deltas.
      ruleIndex.*
        ← new
        Action: write fresh
        Notes: the reverse index — condition → rules → connections. This is the single reason G2's
               tables are normalised rather than a JSON column: building this from JSON documents
               means parsing every document at boot and again on every save.
    ws/
      session.*
        ← was src/services/apollo/{RobustTimeout,AbortableContext}.js (in spirit)
        Action: rewrite
        Notes: those two exist to throttle and abort overlapping HTTP polls. A persistent socket
               removes the problem rather than solving it. Keep the idea that a superseded request
               must not clobber a newer one; drop the machinery.
      delta.*
        ← was src/pages/map/components/QueryData.jsx (the refetch half)
        Action: rewrite
        Notes: today a filter change triggers a refetch as a side effect of a useEffect dependency
               identity changing. Make it an explicit "filters changed" message. The trace called
               this out specifically: do not reconstruct the implicit-effect pattern over a socket.
    auth/
      verify.*
        ← was server/src/middleware/apollo.js:19 + server/src/routes/rootRouter.js:195
        Action: merge
        Notes: `req.user ? req.user.perms : req.session.perms` is currently duplicated verbatim in
               two places. A socket handler makes three. Factor it once here, called over an
               internal HTTP contract against the strangled server — mapd never requires state.js,
               which registers process signal handlers and cannot exist twice.

app/                                            ← greenfield TypeScript client
  routes.ts
    ← was src/pages/index.jsx
    Action: rewrite
    Notes: G15. `/` becomes a real landing page (today it renders the map directly); the map moves
           to `/map`, keeping `@/:lat/:lon` as a deep-link alias; Poracle gets `/alerts` (name TBD)
           instead of a modal. Route-splitting falls out of this for free — the 3,796-line webhook
           feature stops loading on first paint.
  landing/
    ← new, no old equivalent
    Action: write fresh
    Notes: G15. Public-facing copy, so it goes through the humanizer pass before shipping rather
           than after. Also the natural home for the demo/screenshot surface the README currently
           points at an external URL for.
  ui/
    ← was every @mui/* import site (204 of 415 files, 834 import lines)
    Action: replace-with-lib
    Notes: G13. shadcn/ui — Radix primitives plus Tailwind, components copied into the tree rather
           than imported from a runtime library. Drops @mui/material, @mui/icons-material, @mui/lab
           and the transitive @emotion runtime from the bundle. 71 distinct MUI components and 82
           icons need shadcn or lucide equivalents; 187 `sx=` props become utilities; the 26 files
           reaching for useTheme/styled/createTheme become CSS variables on :root.
  theme.css
    ← was src/assets/css/main.css (partial) + MUI createTheme
    Action: split
    Notes: 1,547 lines, 119 selectors. Component styling moves to Tailwind; the Leaflet marker,
           cluster and popup rules STAY plain CSS — they are injected into Leaflet's DOM, not
           rendered by React, so Tailwind's utility classes never reach them.
  shell/
    boot.ts
      ← was src/index.jsx + src/App.jsx + src/components/Config.jsx
      Action: rewrite
      Notes: the cold-load trace found the same facts arriving three ways — build-time CONFIG
             define, /api/settings, and persisted localStorage — with Config.jsx silently
             overwriting the first from the second by untyped chained property access. One typed
             source, validated at the boundary.
    session.ts
      ← was src/components/auth/* (client half)
      Action: port
      Notes: same cookie, same session, same permission source as 1.0. This is assumption A2 and
             it is what lets app/ ship at 30% complete instead of dying as a long branch.
  map/
    engine.ts
      ← was src/pages/map/components/Container.jsx + src/store/useMapStore.js
      Action: rewrite (blocked on A4)
      Notes: react-leaflet's MapContainer is the sole owner of the L.Map instance, and 35 files
             import react-leaflet directly with no abstraction layer. That is why the render-layer
             decision forces a greenfield client whichever way it goes — there is no half-Leaflet
             state. Put an engine interface here so the decision is reversible.
    markers/
      ← was src/features/*/​*Tile.jsx + use*Marker.js
      Action: rewrite
      Notes: 13 tile components. If deck.gl wins, this becomes layers and the icon-compositing
             pipeline moves here; if Leaflet stays, it is a port with virtualisation added.
    ticker.ts
      ← was src/components/ToolTipWrapper.jsx
      Action: rewrite
      Notes: 42 lines causing the worst measured problem in the app. One app-level interval, a
             registry of {node, expireTimestamp}, imperative textContent writes, and adaptive
             granularity so a timer minutes out is not recomputed every second. Zero React in the
             loop. Note the earlier "add a dependency array" suggestion was wrong — the missing
             array is the mechanism that keeps it ticking.
    clustering.ts
      ← was src/pages/map/components/Clustering.jsx
      Action: port + redesign
      Notes: Supercluster is constructed with maxZoom: rules.zoomLevel (15 for pokemon), so above
             that zoom forcedLimit fires, builds a clusterer, and the clusterer declines to cluster.
             forcedLimit must actually bound, or be renamed to stop promising it does.
  rules/
    editor/
      ← was src/features/drawer/** + src/components/filters/*
      Action: rewrite
      Notes: G1, the highest-priority goal. Rules rendered as editable sentences. The drawer shell
             itself is dumb — it maps server-provided ui keys — so the real cost is the selector
             grid and the Advanced dialog, not the accordion.
    preview.ts
      ← new
      Action: write fresh
      Notes: live match count while editing. /api/pokemon/v3/scan already returns examined/skipped/
             total, so the data exists today. Nothing explains a filter faster than watching the
             number move, and it kills the most common support question.
    migrate.ts
      ← was server/src/filters/pokemon/functions.js:dnfifyIvFilter
      Action: port + redesign
      Notes: MapJS-string → rules importer, kept for one release so power users have a path. Then
             both this and the vm.runInNewContext compiler go.
  entities/
    ← was src/features/*/​*Popup.jsx + src/components/popups/*
    Action: port + redesign
    Notes: keep the shared-primitives split — src/components/popups/ (Title, Coords, Navigation,
           TimeTile, BackgroundCard…) composed by per-feature popups is one of the better-factored
           corners and survives largely intact. PokestopPopup at 1,090 lines is the one to break up.
  alerts/                                       ← its own route, not a modal
    ← was src/features/webhooks/**
    Action: port + redesign
    Notes: G14, both halves. (a) A route rather than a dialog mounted unconditionally from Nav.jsx
           for every logged-in user regardless of perms.webhooks — that alone takes 3,796 lines off
           first paint, and the whole app currently has exactly one React.lazy call, unrelated.
           (b) Single-provider: Poracle is the only backend, so the selection plumbing goes —
           selectedWebhook (55 refs / 7 files), webhookObj as a Record, validateSelectedWebhook,
           and webhookPerms returning a Set of allowed names all collapse to a boolean.
           WebhookAdv.jsx keeps two parallel state shapes (UI-shaped and wire-shaped) in lockstep
           with zero tests — highest-risk single file in the client for a faithful port to silently
           diverge, and being a page rather than a modal does not make that easier.

server/                                         ← strangled, not rewritten
  src/
    auth/
      ← was server/src/{strategies,services/{AuthClient,DiscordClient,TelegramClient,LocalClient,Trial}}
      Action: keep (untouched)
      Notes: zero tests and — unlike the model layer — not in the hot list either. Frozen while
             everything around it moved. That is exactly the profile of code whose value is
             accumulated behaviour: live Discord role invalidation, the trial state machine,
             Telegram HMAC widget verification, account linking and badge merge. Strangle behind
             a contract; do not re-derive.
    perms/
      ← was server/src/utils/{mergePerms,areaPerms,webhookPerms,scannerPerms}.js
      Action: refactor in place
      Notes: fix the two real defects (trial grants scoped to trial-designated roles; stop
             OR-merging cached perm columns so revocation can propagate) without restructuring.
             Then expose over the internal contract mapd calls.
    areas/
      ← was server/src/services/areas.js + utils/{consolidateAreas,getAreaSql,filterRTree}.js
      Action: port + redesign
      Notes: the open design question. getAreaSql interpolates GeoJSON into raw SQL and dies with
             the scanner models; consolidateAreas encodes three distinct empty-list semantics plus
             parent fallback in thirty uncommented lines. Decide explicitly where polygon
             containment happens post-Golbat — a fence parameter on the scan (preferred; Golbat
             already parses fences for /api/pokestop-positions), or post-fetch filtering. Post-fetch
             starves area-restricted users when Golbat's cap fills with out-of-area forts.
    filters/
      rules/
        ← was server/src/filters/pokemon/{Backend,Frontend,constants}.js
        Action: rewrite
        Notes: evaluates rules two ways — shaping a Golbat DNF query, and matching an inbound
               webhook entity for push. Same rules, two directions.
      fort/
        ← was server/src/filters/fort/*
        Action: promote
        Notes: KEEP. Production DNF translation since a9daf360. filters/fort/pokestop.js also names
               a real incident — the accumulated-keys 997-stop over-return — and derives exact-form
               matching from it. This file is a spec, not debt.
      storage/
        ← new
        Action: write fresh
        Notes: the G2 tables — filter_set, filter_rule, filter_rule_target, filter_rule_condition,
               filter_active, filter_share. Normalised because of ruleIndex above.
    poracle/
      ← was server/src/services/Poracle.js
      Action: refactor in place
      Notes: not a thin proxy — it holds a standing mirror of Poracle's config, geofences and
             templates, version-gated at ≥4.8.4. Transport-agnostic; only the resolver surface
             changes. 1,260 lines that mostly survive. G14 simplifies it: webhookObj stops being a
             Record keyed by provider name and becomes one instance, and the ~250 lines of
             selection and validation plumbing around it go.
    identity/
      ← was server/src/models/{User,Session,Badge,Backup,NestSubmission}.js
      Action: port
      Notes: ReactMap's own tables. Parameterise Session.js's whereRaw interpolation on the way.
             Backups serialise the per-form filter shape G1 replaces — existing backups need a
             migration or an explicit "old backups are not importable" decision.
    manual/
      ← was server/src/models/{Nest,Portal}.js
      Action: port
      Notes: the permanent residual database connection. Golbat has no nest or portal concept —
             nests are Fletchling, portals are Ingress in a manual DB. This is why the goal is
             "no scanner-database connection", not "no database".
    admin/
      ← was server/src/routes/api/v1/*
      Action: keep (untouched)
      Notes: secret-gated REST for external tooling — dashboards and monitoring scripts hit it, and
             no flow trace touched it because it is outside the browser app. Parameterise
             sessions.js first. Deleting GraphQL must not silently take this with it.
    http/
      ← was server/src/middleware/* + routes/{authRouter,rootRouter,clientRouter}.js
      Action: refactor in place
      Notes: transport-agnostic and mostly survives. Fix compression ordering, rate-limiter
             placement, session cookie flags, and secret.js's non-constant-time comparison.
             /api/settings shrinks a lot once server/src/ui/ is gone.
```

---

## Bulk 1:1 Ports

| Old                                                                                                              | New                                                     | Notes                                                                                                                                                                                           |
| ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/utils/*` (35 of 37 files)                                                                                   | `app/lib/*`                                             | Pure functions — geometry, formatting, S2 helpers. Mechanical, but `setDeep` needs a reference-identity test first: it mutates what it is handed and relies on the caller having already copied |
| `server/src/utils/{getBbox,getPolyVector,getTypeCells,getPlacementCells,getCenter,getClientTime,deepCompare}.js` | `server/src/lib/*`                                      | Mechanical                                                                                                                                                                                      |
| `server/src/utils/{rocketPokemonFiltering,questLayerMode,showcaseFocus,hasAnyPokestopPermission}.js`             | `server/src/filters/lib/*`                              | Direct dependencies of the fort DNF builders. Port as-is and characterise — these are on the critical path and no trace reached them                                                            |
| `server/src/utils/getValidCoords.js`                                                                             | `server/src/scanner/validate.ts`                        | `[STALE]` two years, zero tests, and the one authoritative gate between client coordinates and real scanner hardware. Port deliberately                                                         |
| `server/src/services/{geocoder,photonGeocoder}.js`                                                               | `server/src/geo/*`                                      | 22 of the repo's 53 tests live here — the best-covered code in the project                                                                                                                      |
| `server/src/services/scannerApi.js`                                                                              | `server/src/scanner/adapters/{rdm,dragonite,custom}.ts` | 21 platform-conditional sites in one function becomes one module per platform behind an interface                                                                                               |
| `server/src/db/migrations/*`                                                                                     | unchanged                                               | Knex migrations for ReactMap's own tables. G2 appends                                                                                                                                           |
| `src/components/virtual/*`                                                                                       | `app/ui/virtual/*`                                      | The virtualised selector grid works — a toggle re-renders one cell, not the list                                                                                                                |
| `src/services/{Sentry,desktopNotification}.js`, `useAnalytics`, `ErrorBoundary`                                  | `app/platform/*`                                        | `desktopNotification.js` is hot at 21 commits and untraced by every flow                                                                                                                        |
| `moment-timezone`, `date-fns`, `date-fns-tz`                                                                     | one of them                                             | Each imported by exactly one file today                                                                                                                                                         |

---

## Dropped

| Path                                                             |       Lines | Why                                                                                                   |
| ---------------------------------------------------------------- | ----------: | ----------------------------------------------------------------------------------------------------- |
| `server/src/graphql/{resolvers.js,server.js}`                    |       1,038 | G4. Extract `typeDefs/*.graphql` to `packages/contracts/wire/entities.ts` **first**                   |
| `src/services/queries/*`                                         |       2,544 | 23 files of GraphQL documents                                                                         |
| `src/services/apollo/*`                                          |         238 | Poll-model workarounds a socket removes                                                               |
| SQL query bodies in Gym/Pokemon/Pokestop/Station                 |      ~4,500 | G5/G6. Delete the fallback, not the endpoint path                                                     |
| `server/src/services/DbManager.js` (SQL routing half)            |        ~500 | Port the resilience ideas, drop the routing                                                           |
| `server/src/filters/builder/*`                                   |         528 | Builds the ~777 KB per-request default filter object                                                  |
| `server/src/filters/pokemon/functions.js` — `jsifyIvFilter`      |        ~180 | The MapJS DSL compiler and its `vm.runInNewContext`                                                   |
| `server/src/ui/{drawer,clientOptions,advMenus}.js`               |         863 | The server describes client UI structure; the client fans it in untyped                               |
| `src/components/Config.jsx`                                      |        ~200 | The untyped fan-out that consumes the above                                                           |
| `src/features/drawer/pokemon/FilterHelp.jsx`                     |         537 | If the new model needs a manual, the new model failed                                                 |
| `config/custom-environment-variables.json`                       |       2,465 | Replaced by a naming convention                                                                       |
| `packages/config/.configref`                                     |           1 | A file-length tamper detector, kept in version control                                                |
| `config/default.json` — `defaultFilters`, `clientSideOptions`    | ~180 leaves | Become DB-backed default rule sets and user preferences                                               |
| `multiDomains` config path                                       |           — | Already marked for removal in the next major release. This is it                                      |
| `server/src/utils/evalWebhookId.js`                              |          33 | Verified dead: exact duplicate of `PoracleAPI.getWebhookId`, zero importers                           |
| `src/features/drawer/pokemon/ModeSelector.jsx`                   |          62 | Three tiers collapse into one model                                                                   |
| Multi-provider webhook plumbing                                  |        ~250 | G14 — `selectedWebhook`, `webhookObj` as a Record, `validateSelectedWebhook`, `webhookPerms` as a Set |
| `@mui/material`, `@mui/icons-material`, `@mui/lab`, `@emotion/*` |           — | G13 — replaced by shadcn/ui + Radix + Tailwind. Four runtime dependencies leave the bundle            |

**Total dropped: roughly 11,400 lines**, plus ~2,650 lines of config definition.

---

## Explicitly undecided

These are in the map as open branches, not as omissions.

| Question                                                      | Blocks                   | Where it lands                                                                 |
| ------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------ |
| **A1** — greenfield client + service, strangled auth/config?  | Everything               | The three-tier shape above assumes yes                                         |
| **A4** — deck.gl/MapLibre or Leaflet?                         | `app/map/*`              | Measure after `ticker.ts` and clustering fixes                                 |
| **G12** — is `services/mapd/` Go or Node?                     | `services/mapd/*`        | Decide after the deletions; they change the answer                             |
| Area containment post-Golbat — fence parameter or post-fetch? | `server/src/areas/`      | Fence preferred; needs Golbat work                                             |
| Perms live-computed or snapshot-at-login?                     | `server/src/perms/`      | Today they freeze into the session blob and only Discord has live invalidation |
| Keep the `.custom.jsx` override contract?                     | `packages/vite-plugins/` | Breaking it is silent — no compiler signal                                     |
| Tutorial: port, rewrite, or drop?                             | `app/`                   | Hooks into specific drawer and filter DOM                                      |
| Existing backups: migrate or abandon?                         | `server/src/identity/`   | They serialise the filter shape being replaced                                 |
