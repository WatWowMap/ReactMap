# Assessment

Phase 3. One verdict per module, drafted from the audit, the five flow traces, and the
heuristic tags. Written against `90f94e63`.

**Review this in bulk and flip whatever is wrong** — that is the intended use. Confidence is
about the verdict, not the evidence.

Verdicts: **Keep** · **Refactor in place** · **Rewrite** · **Delete** · **Defer**

---

## Correction to carry into everything below

The completeness pass flagged the Golbat DNF fort-filter path as the biggest blind spot in
the traces, and it is right that no trace exercised it — all five were Pokémon-centric, and
the one that touched forts only walked `*.search`, which genuinely is SQL-only.

But its stronger claim — that a 2.0 plan would treat Golbat-only as unstarted greenfield
work — does not apply here. The audit established the opposite early: Gym, Pokemon, Pokestop
and Station all carry endpoint branches, and commit `a9daf360` (2026-07-29, _"fort map-data
consumer — gyms, stations & pokestops - with DNF filtering"_) shipped it four weeks before
this audit began.

**The framing that matters:** `server/src/filters/fort/*` is not code to write. It is code to
**keep and promote**. What gets deleted is the SQL fallback beside it. That flips the verdict
on 569 lines from Rewrite to Keep, and it means Phase 3 of the roadmap is _finishing_ a
migration rather than starting one.

---

## Server — data layer

### `server/src/models` — 7,347 lines, 23 files

Split verdict; this directory is not one thing.

| Sub-group                                                                                       | Verdict            | Evidence                                                                                                                                                                                                         | Confidence |
| ----------------------------------------------------------------------------------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| SQL query bodies in Gym, Pokemon, Pokestop, Station                                             | **Delete**         | `[HOT][COMPLEX][UNTESTED]` — Pokestop 2,380 lines / 67 commits, Pokemon 909 / 50, Station 1,402 / 42. ~230 capability-flag branches exist only to sniff a schema ReactMap does not own                           | High       |
| Golbat endpoint branches in the same four files                                                 | **Keep → extract** | Already production since `a9daf360`. Promote to the only path                                                                                                                                                    | High       |
| Route, ScanCell, Spawnpoint, Weather, Tappable                                                  | **Rewrite**        | 797 lines, SQL-only, no endpoint branch. Golbat owns all five (`routes.go`, `s2cell.go`, `spawnpoint.go`, `weather.go`, `tappable.go`) but exposes none — blocked on Golbat work, then these become thin clients | High       |
| Nest, NestSubmission, Portal                                                                    | **Keep**           | Golbat has no nest or portal concept at all. These keep a DB connection permanently                                                                                                                              | High       |
| User, Session, Badge, Backup                                                                    | **Keep**           | ReactMap's own tables. `Session.js` needs its `whereRaw` interpolation parameterised                                                                                                                             | High       |
| `gymAvailableMapper`, `pokestopAvailableMapper`, `pokestopScanMapper`, `stationAvailableMapper` | **Defer**          | They exist to make endpoint output match SQL output. Once SQL is gone, ask Golbat to emit the right shape and delete them. Do not delete early — they encode real shape differences                              | Medium     |

**Tension with goals:** this directory _is_ G5 and G6. It is also the largest single block of
`[UNTESTED]` logic in the repo.

### `server/src/filters` — 1,960 lines

| Path                                                               | Verdict     | Evidence                                                                                                                                                                               | Confidence |
| ------------------------------------------------------------------ | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `filters/fort/*` (569)                                             | **Keep**    | The DNF translation to Golbat. Production code. `filters/fort/pokestop.js` also names a real incident — the accumulated-keys 997-stop over-return — and derives matching rules from it | High       |
| `filters/pokemon/{Backend,Frontend,constants}.js`                  | **Rewrite** | The per-form filter model G1 replaces. `Backend.js` builds a string DSL then compiles it                                                                                               | High       |
| `filters/pokemon/functions.js` — `jsifyIvFilter`, `dnfifyIvFilter` | **Delete**  | The MapJS DSL tokenizer and its `vm.runInNewContext`. Keep an importer for one release                                                                                                 | High       |
| `filters/pokemon/getWildFilterKey.js`                              | **Keep**    | Ditto-disguise normalisation. Small, subtle, correct. Port as-is with a test                                                                                                           | High       |
| `filters/builder/*` (528)                                          | **Delete**  | Builds the ~777 KB default filter object per request. G1 and G3 both remove the need                                                                                                   | High       |

### `server/src/services` — 6,115 lines, 22 files

| Path                                                                                                                                       | Verdict               | Evidence                                                                                                                                                                                             | Confidence |
| ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `DbManager.js` (858)                                                                                                                       | **Rewrite**           | `[HOT]` 22 commits. The source-resilience patterns (`allSettled`, generation gating, last-good retention) are genuinely good and should be **ported as ideas**; the SQL routing dies with the models | High       |
| `Poracle.js` (1,260)                                                                                                                       | **Refactor in place** | Not a thin proxy — it holds a standing mirror of each Poracle's config, geofences and templates, version-gated at ≥4.8.4. Real logic, transport-agnostic. Only the resolver surface changes          | High       |
| `EventManager.js` (563)                                                                                                                    | **Refactor in place** | `[HOT]` 42 commits. Single-flight, TTL and generation-gating on `setAvailable` is careful work. Keep the machinery, re-point the sources                                                             | Medium     |
| `state.js` (~230)                                                                                                                          | **Rewrite**           | `[COUPLED]` require-time singleton registering process signal handlers; cannot be instantiated twice. Directly blocks A1/A2 — a sibling 2.0 service cannot require it                                | High       |
| `scannerApi.js` (392)                                                                                                                      | **Rewrite**           | 21 platform-conditional sites across coordinate formatting, auth headers, three URL/body switches and response parsing, in one function. Textbook adapter shape                                      | High       |
| `areas.js` (386)                                                                                                                           | **Keep**              | Geofence loading and caching behind `perms.areaRestrictions`. Untraced by any flow but load-bearing — and the open question of where polygon containment happens post-Golbat lands here              | High       |
| `AuthClient`, `DiscordClient`, `TelegramClient`, `LocalClient`                                                                             | **Keep**              | The accumulated behaviour worth strangling rather than rewriting. Zero tests and, unlike the model layer, _not_ in the hot list — frozen while everything moved                                      | High       |
| `Trial.js`                                                                                                                                 | **Keep**              | Trial-window state machine. Subtle, undocumented, works                                                                                                                                              | Medium     |
| `geocoder.js`, `photonGeocoder.js`                                                                                                         | **Keep**              | 22 of the repo's 53 tests are here — the best-covered code in the project                                                                                                                            | High       |
| `watcher.js`, `checkForUpdates.js`, `cache.js`, `i18n.js`, `logUserAuth.js`, `Stats.js`, `Timer.js`, `DataLimitCheck.js`, `PokemonData.js` | **Port**              | Mechanical. `PokemonData.js` (ohbem) may become deletable if Golbat exposes station CP                                                                                                               | Medium     |

### `server/src/graphql` — 2,053 lines

| Path                         | Verdict                  | Evidence                                                                                                                                                       | Confidence |
| ---------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `resolvers.js` (868)         | **Delete**               | `[HOT]` 43 commits. G4                                                                                                                                         | High       |
| `server.js` (170)            | **Delete**               | Apollo bootstrap                                                                                                                                               | High       |
| `typeDefs/*.graphql` (1,015) | **Extract, then delete** | Do not just delete. These are the definitive inventory of every operation needing a WebSocket or REST equivalent. Three of four were never opened by any trace | High       |

---

## Server — everything else

| Path                                                                                                    |  Lines | Verdict               | Evidence                                                                                                                                                        | Confidence |
| ------------------------------------------------------------------------------------------------------- | -----: | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `server/src/ui/{drawer,clientOptions,advMenus}.js`                                                      |    863 | **Delete**            | `[COUPLED]` The server describes client UI structure and the client fans it into Zustand untyped. G7 and A1 both remove the need                                | High       |
| `server/src/routes/api/v1/*`                                                                            |    481 | **Keep**              | External tooling contract — admin dashboards and monitoring hit these. Invisible to all five traces. `sessions.js` needs its SQL parameterised first            | High       |
| `server/src/routes/{authRouter,rootRouter,clientRouter}.js`                                             |    427 | **Refactor in place** | `[HOT]` rootRouter 24 commits. `/api/settings` shrinks a lot once `ui/` dies                                                                                    | Medium     |
| `server/src/middleware/*`                                                                               |    431 | **Keep**              | Transport-agnostic. Fix the compression ordering, the rate-limiter placement, the session cookie flags, and `secret.js`'s comparison                            | High       |
| `server/src/strategies/*`                                                                               |     60 | **Keep**              | Thin passport registration                                                                                                                                      | High       |
| `server/src/db/*` + migrations                                                                          |    334 | **Keep**              | Knex migrations for ReactMap's own tables. G2 adds to these                                                                                                     | High       |
| `server/src/utils/{rocketPokemonFiltering,questLayerMode,showcaseFocus,consolidateAreas,getAreaSql}.js` |   ~600 | **Keep → spec**       | These are the executable spec. `consolidateAreas` encodes three empty-list semantics plus parent fallback in 30 uncommented lines. Characterise before touching | High       |
| `server/src/utils/evalWebhookId.js`                                                                     |     33 | **Delete**            | Verified: exact duplicate of `PoracleAPI.getWebhookId`, zero importers                                                                                          | High       |
| `server/src/utils/getValidCoords.js`                                                                    |    ~60 | **Keep**              | `[STALE]` no commits in 2 years, zero tests — and it is the one authoritative gate between client coordinates and real scanner infrastructure                   | High       |
| `server/src/utils/*` remainder                                                                          | ~1,150 | **Port**              | Mechanical pure functions                                                                                                                                       | Medium     |
| `server/test/*`                                                                                         |  1,911 | **Keep → grow**       | 53 tests, 6 files. The base of G-prerequisite A3                                                                                                                | High       |

---

## Client

| Path                                                                            |  Lines | Verdict               | Evidence                                                                                                                                                                                                                                                             | Confidence |
| ------------------------------------------------------------------------------- | -----: | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `src/services/queries/*`                                                        |  2,544 | **Delete**            | 23 files of GraphQL documents. G4                                                                                                                                                                                                                                    | High       |
| `src/services/apollo/*`                                                         |    238 | **Delete**            | `RobustTimeout` and `AbortableContext` are workarounds for the HTTP-poll model a socket removes                                                                                                                                                                      | High       |
| `src/features/drawer/**`                                                        |  3,223 | **Rewrite**           | The rules UI is G1. Note the drawer shell itself is dumb — it maps server-provided `ui` keys — so most of the cost is in the selector and filter dialogs                                                                                                             | High       |
| `src/components/filters/*`                                                      |    971 | **Rewrite**           | Same                                                                                                                                                                                                                                                                 | High       |
| `src/components/virtual/*`                                                      |    351 | **Keep → port**       | The virtualised selector grid works well; a toggle re-renders one cell, not the list                                                                                                                                                                                 | Medium     |
| `src/features/drawer/pokemon/FilterHelp.jsx`                                    |    537 | **Delete**            | If the new model needs this, the new model failed                                                                                                                                                                                                                    | High       |
| `src/components/popups/*`                                                       |    759 | **Keep**              | Shared popup primitives composed by feature popups. One of the better-factored corners                                                                                                                                                                               | High       |
| `src/features/*/*Popup.jsx`                                                     | ~4,400 | **Port + redesign**   | `[HOT]` GymPopup 44, StationPopup 41, PokestopPopup 38, PokemonPopup 31. PokestopPopup alone is 1,090 lines of per-category display logic with zero tests                                                                                                            | Medium     |
| `src/features/*/​*Tile.jsx`, `use*Marker.js`                                    | ~2,500 | **Rewrite**           | Depends entirely on the render-layer decision (A4). `[COUPLED]` 35 files import react-leaflet directly with no abstraction                                                                                                                                           | High       |
| `src/components/ToolTipWrapper.jsx`                                             |     42 | **Rewrite**           | 42 lines causing the worst measured perf problem in the app. Shared ticker, imperative writes                                                                                                                                                                        | High       |
| `src/pages/map/components/Clustering.jsx`                                       |   ~200 | **Rewrite**           | `maxZoom: rules.zoomLevel` makes `forcedLimit` inert above zoom 15                                                                                                                                                                                                   | High       |
| `src/features/webhooks/**`                                                      |  3,796 | **Keep → lazy-load**  | Statically imported into `Nav.jsx`, `Container.jsx` and `GymPopup.jsx`, mounted for every logged-in user regardless of `perms.webhooks`. `WebhookAdv.jsx` keeps two parallel state shapes in lockstep with zero tests — highest-risk single file for a faithful port | High       |
| `src/store/*`                                                                   |    856 | **Rewrite**           | `setDeep` achieves immutability by mutating what it was handed, relying on the caller having already copied. A tidy-up port turns that into a shared-reference bug. Needs a reference-identity test first                                                            | High       |
| `src/components/Config.jsx`                                                     |   ~200 | **Delete**            | `[HOT]` 31 commits, `[COUPLED]` — untyped fan-out of a server blob into three stores by chained property access                                                                                                                                                      | High       |
| `src/services/Assets.js`                                                        |    675 | **Refactor in place** | `[HOT]` 26 commits. UICONS resolution is sound; only the consumer changes if deck.gl lands                                                                                                                                                                           | Medium     |
| `src/features/tutorial/**`                                                      |  1,087 | **Defer**             | Hooks into specific drawer and filter DOM. Needs an explicit keep-or-drop, not silent loss                                                                                                                                                                           | Medium     |
| `src/features/profile/{Backups,GymBadges}.jsx` + `Backup.js`                    |   ~650 | **Refactor in place** | Backups serialise the per-form filter shape G1 replaces — needs a migration story for existing backups                                                                                                                                                               | High       |
| `src/features/holiday/**`                                                       |    206 | **Defer**             | Cosmetic, but hooks into Leaflet pane structure                                                                                                                                                                                                                      | Low        |
| `src/features/builder/**` + `customFile.js` plugin                              |   ~600 | **Keep → decide**     | Any `Foo.custom.jsx` silently replaces `Foo.jsx` at build time. A TS restructure breaks every operator override with no compiler signal. Explicit decision, not omission                                                                                             | High       |
| `src/utils/*`                                                                   |  1,315 | **Port**              | Mechanical                                                                                                                                                                                                                                                           | High       |
| `src/pages/{data,locales,playground}/**`                                        | ~1,000 | **Defer**             | Admin surfaces. Low risk, real users                                                                                                                                                                                                                                 | Medium     |
| `src/services/{Sentry,desktopNotification}.js`, `useAnalytics`, `ErrorBoundary` |    405 | **Port**              | `desktopNotification.js` is `[HOT]` at 21 commits yet untraced                                                                                                                                                                                                       | Medium     |

---

## Presentation layer — added after G13/G14/G15

| Path                                                                                                                                    |                                 Lines | Verdict             | Evidence                                                                                                                                                                                     | Confidence |
| --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------: | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Every `@mui/*` import site                                                                                                              | 834 lines across **204 of 415 files** | **Rewrite**         | 71 distinct `@mui/material` components, 82 icons, 187 `sx=` props, 26 files on `useTheme`/`styled`/`createTheme`. Not migratable in place at that density                                    | High       |
| `src/assets/css/main.css`                                                                                                               |                                 1,547 | **Split**           | 119 class selectors. Component styling becomes Tailwind utilities; the Leaflet marker/cluster/popup rules stay plain CSS because they are injected into Leaflet's DOM, not rendered by React | High       |
| `src/pages/index.jsx` route table                                                                                                       |                                    60 | **Rewrite**         | `/` renders the map directly with `@/:lat/:lon` as a deep-link alias. G15 adds a landing page and moves the map to `/map`                                                                    | High       |
| Multi-provider webhook plumbing — `selectedWebhook` (55 refs / 7 files), `webhookObj` (18/7), `validateSelectedWebhook`, `webhookPerms` |                                  ~250 | **Delete**          | G14. Built for webhook backends that never arrived. A `Set` of allowed provider names becomes a boolean                                                                                      | High       |
| `src/features/webhooks/**` placement                                                                                                    |                                 3,796 | **Rewrite → route** | Currently mounted unconditionally from `Nav.jsx` for every logged-in user regardless of `perms.webhooks`. As a route it lazy-loads for free                                                  | High       |

**Note on the tally below:** G13 does not add much _new_ rewrite work so much as it removes the
option of not rewriting. Most of the client files it touches were already Rewrite or
Port + redesign for other reasons.

---

## Packages

| Path                                           | Lines | Verdict           | Evidence                                                                                                                                                                                                                                      | Confidence |
| ---------------------------------------------- | ----: | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `packages/types/lib/*.d.ts`                    | 1,962 | **Keep → evolve** | `scanner.d.ts` 44 commits, `server.d.ts` 43 — both `[HOT]`, neither opened by any trace. This is the closest thing to a schema the repo has, and it is honestly derived from runtime shapes. Reusing it is far cheaper than re-deriving types | High       |
| `packages/config/lib/*`                        |   577 | **Rewrite**       | `mutations.js` is 381 lines of load-time migration. G10. But read it before replacing — it is today's schema-adjacent layer                                                                                                                   | High       |
| `packages/locales/lib/*` + `src/pages/locales` |  ~900 | **Keep**          | Generated translations from one English source is the right design                                                                                                                                                                            | High       |
| `packages/masterfile/lib/*`                    |   214 | **Keep**          | G3 changes how it is _delivered_, not what it is                                                                                                                                                                                              | High       |
| `packages/logger/lib/*`                        |   217 | **Keep**          | Fine                                                                                                                                                                                                                                          | High       |
| `packages/vite-plugins/lib/*`                  |   206 | **Keep → decide** | See `customFile.js` above                                                                                                                                                                                                                     | High       |

---

## Tally

| Verdict           | Modules | Approx. lines |
| ----------------- | ------: | ------------: |
| Keep / Keep→port  |      26 |       ~12,400 |
| Refactor in place |       7 |        ~3,900 |
| Rewrite           |      12 |       ~13,600 |
| Delete            |      11 |        ~7,900 |
| Defer             |       5 |        ~2,500 |

Roughly **11,400 lines deleted outright**, ~13,600 rewritten, and — the number worth noticing —
**~16,300 lines kept or refactored in place**, most of it the auth, permission, config, area
and Poracle machinery whose value is accumulated behaviour rather than code quality.

That ratio is the argument for splitting the strategy by layer rather than choosing globally.
