# Refactor Goals

Written against `90f94e63` on branch `c/project-2-0-audit-49a89f`.

Phase 2 of the systematic-refactor workflow. Goals here are drawn from what Rin stated
across the audit session rather than from a fresh questionnaire — she asked that we use
what we already have. Everything she decided explicitly is marked **stated**; everything
inferred is marked **assumed** and needs a yes/no before it hardens into a plan.

---

## 1. Drivers

From the standard checklist, the picks are:

| Driver                              | Status              | What Rin actually said                                                                                  |
| ----------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------- |
| Architecture (boundaries, layering) | **stated**          | Golbat becomes the data source; gut RDM/MAD remnants                                                    |
| API surface change (breaking)       | **stated**          | "Removing graphql, just native websocket is fine"                                                       |
| Performance                         | **stated**          | "rendering past 3k markers gets pretty choppy. The timers get reallllly choppy"                         |
| Readability / maintainability       | **stated**          | "the config is absolutely batshit"; filters "too complicated for any human to understand"               |
| Language/runtime change             | **stated, partial** | "All client files should be typescript"; "maybe rewrite the backend in GO?" — the Go half is still open |
| Dependency reduction                | **stated**          | Implied by Golbat-only and by config cuts                                                               |
| Testability                         | **assumed**         | Never raised directly. 53 backend tests, 0 frontend. Treated as a prerequisite, not a goal              |
| Team handoff / onboarding           | not raised          | —                                                                                                       |

---

## 2. Goals, in Rin's priority order

She ordered these herself: _"most importantly: make filtering easier to use and understand."_

### G1 — Filtering that a person can understand without a manual _(stated, highest priority)_

The current system has three modes encoded in two booleans, per-Pokémon overrides whose
inheritance depends on a setting three screens away, and an expert mode that is a
hand-rolled string DSL compiled through `vm.runInNewContext`. The README already lists the
basic and intermediate filters under _Deprecated Features_ because the logic is beyond
human comprehension, and there is a 537-line in-app dialog whose only job is explaining the
AND/OR semantics.

**Target:** one model — an ordered list of named rules, each with a scope, some conditions,
and a display treatment. Rules OR together; conditions within a rule AND together. Rendered
as an editable sentence, so the rule and its explanation are the same object. Live match
count while editing.

**Success looks like:** the help dialog can be deleted without replacing it.

### G2 — Filters stored server-side in real tables _(stated)_

Today filters live only in `localStorage` under one key, re-serialised on every keystroke.
Clearing site data loses them; a second device never sees them.

**Target:** normalised tables — `filter_set`, `filter_rule`, `filter_rule_target`,
`filter_rule_condition`, `filter_active`, `filter_share`. Normalised rather than a JSON
column specifically because push transport needs a reverse index (condition → rules → users)
to decide which connected clients care about an incoming entity.

Rin pushed back on an earlier JSON-column recommendation and was right to.

### G3 — Networking: smaller payloads, push instead of poll _(stated)_

Cold load ships ~1.6 MB of JSON (830 KB masterfile + 777 KB default filters). Steady state
re-fetches the entire viewport every 10–20 s per category with `fetchPolicy: no-cache`.

**Target:** masterfile as a hashed static asset; the client sends a rule list (3–10 objects)
rather than receiving 1,489 filter objects; one WebSocket per client carrying `add`/`update`/
`remove` deltas by id, fed by Golbat's existing 1 s webhook flush.

**Explicitly not the first move:** binary framing. Deltas shrink payloads below the point
JSON overhead matters. Measure before reaching for protobuf.

### G4 — Delete GraphQL _(stated)_

Not "improve" — remove. Every data query already takes `filters: JSON`, so GraphQL carries
no type information at the boundary; it is functioning as an HTTP POST with a parser
attached, while the client pays for Apollo, `graphql`, and a normalised cache it barely uses.

### G5 — Golbat as the only _scanner_ data source _(stated, scope corrected)_

Rin's framing was "improve comms with golbat". The audit sharpened it: today every fort model
carries a Golbat endpoint branch _and_ a SQL fallback, with comments about keeping the two
byte-identical.

**Scope correction, and it matters:** "Golbat is the only data source" cannot be literally
true. Golbat has no nest and no portal concept at all — nests come from Fletchling, portals
are Ingress data in a manual database. The goal is **no scanner-database connection**, with a
narrowed residual connection for nests, portals and ReactMap's own tables.

### G6 — Gut the RDM/MAD inheritance _(stated)_

Only 12 literal name references. The real inheritance is structural: `schemaCheck` and its
~20 capability flags across ~230 branch sites, the MapJS/PMSF filter DSL, and raw SQL as the
data interface. G5 retires 15 of the 20 flags; G1 retires the DSL.

### G7 — All client files TypeScript _(stated)_

531 of 536 files already carry `@ts-check` and `packages/types` is honestly derived from
runtime shapes — but nothing runs `tsc`. No `tsconfig.json`, checker commented out in
`vite.config.js`, no CI step, and ESLint has no TS parser.

**Target:** enforcement first, conversion second.

### G8 — Mobile as a first-class constraint _(stated)_

Not a CSS problem. The store writes the whole persisted state on every keystroke;
`user-scalable=no` disables pinch-zoom; exactly one media query exists in the entire
stylesheet; 2 of 49 icon buttons have an accessible name.

### G9 — Performance at real marker counts _(stated, with measurements)_

Rin's own numbers: choppy past 3,000 markers, and timers are the worst part. Two independent
causes were identified, both fixable without a new render engine:

- `ToolTipWrapper` mounts a permanent Leaflet tooltip per marker whose `Timer` re-renders at
  1 Hz, unsynchronised — 3,000 React re-renders per second smeared across every frame.
- `Supercluster` is constructed with `maxZoom: rules.zoomLevel` (15 for Pokémon), so above
  that zoom `forcedLimit` fires, builds a clusterer, and the clusterer declines to cluster.

### G10 — Config that declares shapes instead of enumerating instances _(stated)_

Rin: _"the config is absolutely batshit."_ Measured: 3,574 lines across two hand-mirrored
files defining 611 keys — 5.8 lines of definition per settable key — with only 7 keys
genuinely unreferenced. 45% of leaves are repeated key names.

### G11 — Auth reviewed properly _(stated)_

Done as part of the audit; findings carried into the map. One item deliberately retained by
Rin's decision and not tracked further here.

### G12 — Backend in Go _(stated as a question, deliberately unresolved)_

Rin's framing: _"maybe rewrite the backend in GO?"_

**Recommendation carried forward:** not as a wholesale rewrite. Of 23,682 backend lines,
~7,347 are scanner SQL this plan deletes and ~1,960 are the filter engine it replaces —
porting those means translating code already condemned. What remains is IO glue. The
defensible shape is a Go sidecar owning the live index and WebSocket fan-out, with Node
keeping auth and permissions. Decide after the deletions land, because they change the answer.

### G13 — Replace MUI with shadcn/ui _(stated)_

Rin: _"Mui is so heavy on the client and outdated feeling."_

**Measured blast radius:** 204 of 415 client files import `@mui/*` — 49% of the client. 834
import lines, 71 distinct `@mui/material` components, 82 distinct icons, 187 `sx=` props, 26
files reaching for `useTheme` / `styled` / `createTheme`.

**Target:** shadcn/ui — Radix primitives plus Tailwind, components copied into the tree rather
than imported from a runtime library. Removes `@mui/material`, `@mui/icons-material`,
`@mui/lab` and the transitive `@emotion` runtime from the bundle entirely.

**Knock-on:** adopting shadcn means adopting Tailwind, which splits `src/assets/css/main.css`
(1,547 lines, 119 class selectors). Component styling moves to utilities; the Leaflet marker,
cluster and popup CSS stays plain CSS, because it is injected into Leaflet's DOM rather than
rendered by React.

**This is the goal that settles A1 for the client.** See the note under A1 below.

### G14 — Poracle is the only webhook provider, and it gets its own page _(stated)_

Two separate changes Rin asked for together.

**Single-provider.** The multi-provider abstraction was built for webhook backends that never
materialised. `selectedWebhook` alone has 55 references across 7 files; `webhookObj` is a
`Record<name, PoracleAPI>` with 18; plus `validateSelectedWebhook`, `webhookPerms` returning a
Set of allowed names, and a provider selector in the UI. Collapsing to one provider turns a Set
into a boolean and deletes the selection plumbing on both sides.

**Its own page, not a modal.** Today `WebhookAdvanced` is mounted unconditionally from
`Nav.jsx` for every logged-in user regardless of `perms.webhooks`. As a route it lazy-loads for
free, which is 3,796 lines off first paint.

### G15 — A landing page; the map moves to `/map` _(stated)_

Today `/` renders the map directly (`src/pages/index.jsx:53`), with `@/:lat/:lon` as a deep-link
alias. 2.0 gets a real landing page at `/`, the map at `/map`, and Poracle at its own route.

New surface — and public-facing copy, so it goes through the humanizer pass before shipping.

---

## 3. Constraints

### Stated

- **Breaking changes are allowed.** This is a major version.
- **Rin maintains Golbat too**, so Golbat-side changes are in scope — and three of the four
  longest poles turn out to live there.
- **ReactMap ships to third-party operators.** Self-hosted, multi-tenant, own configs. Any
  migration has to work for people who are not Rin.
- **Production Golbat caps:** 5,000 pokemon results, forts at default. ReactMap currently
  requests 35,000.
- **Gym badges reach a few thousand per user**, against Golbat's 500-id query cap which
  returns 413 rather than truncating. Batching is a prerequisite, not an optimisation.
- **`fort_in_memory=false` is no longer run** on Rin's deployments.

### Assumed — confirm before planning

- **A1 — Migration strategy: greenfield client, greenfield data service, strangled auth/config.**
  Rin leaned greenfield (_"just write 2.0 in place alongside 1.0"_) and two adversarial passes
  converged on splitting by layer rather than choosing globally.
  **G13 effectively settles the client half.** The overlap is close to total: 204 of 415 files
  import MUI, 35 import react-leaflet directly with no abstraction, essentially every file
  converts to TypeScript, and the filter UI is replaced outright. There is no meaningful subset
  of the client left to strangle. The open part of A1 is now the server and data-service half,
  not the client.
- **A2 — 1.0 and 2.0 share a session.** Same cookie, same user table, same permission source,
  per-user opt-in flag. This is what lets 2.0 ship at 30% complete instead of dying as a long
  branch. Assumed because it follows from A1, not because it was stated.
- **A3 — Testing is a prerequisite.** Never raised as a goal. Assumed because every phase
  deletes thousands of lines and the filter files are a documented record of shipped bugs.
- **A4 — deck.gl is not yet decided.** Under consideration. The performance case weakened when
  the popup premise proved false; the architectural case (react-leaflet's `MapContainer` owns
  the map instance, so adopting deck.gl replaces every tile component at once) is the load-bearing
  one. Held open pending measurement after G9's two fixes.

### Unknown — genuinely need answers

- **U1 — Timeline.** No signal at all. Changes whether this is one long arc or a series of
  independently shippable releases.
- **U2 — Who else works on this?** Team size and familiarity with TypeScript and Go decides
  how much of the Go question is even worth asking, and how parallel the phases can run.
- **U3 — Third-party operator upgrade path.** Do they get flipped to 2.0, opt in, or run 1.x
  until it is retired? This constrains how long both stacks must coexist, which is the main
  cost of the greenfield half of A1.

---

## 4. Anti-goals

Recorded so they do not get re-litigated:

- **Not a full backend rewrite in Go.** See G12.
- **Not protobuf as the first networking move.** See G3.
- **Not preserving the MapJS/PMSF filter DSL.** An importer for one release, then gone.
- **Not preserving multi-domain as a tenancy boundary.** It skins the map per host and does
  not scope auth or permissions. Keep the skinning; stop implying isolation.
- **Not "no database".** See G5.
- **Not a multi-provider webhook abstraction.** G14 — it was built for backends that never arrived.
- **Not a component library swap in place.** G13 lands with the greenfield client, not as a 204-file migration on 1.x.
