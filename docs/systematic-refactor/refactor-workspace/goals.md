# Refactor Goals

Written against `90f94e63` on branch `c/project-2-0-audit-49a89f`.

Phase 2 of the systematic-refactor workflow. Goals here are drawn from what the maintainer stated
across the audit session rather than from a fresh questionnaire — she asked that we use
what we already have. Everything she decided explicitly is marked **stated**; everything
inferred is marked **assumed** and needs a yes/no before it hardens into a plan.

---

## 1. Drivers

From the standard checklist, the picks are:

| Driver                              | Status              | What was actually said                                                                                  |
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

## 2. Goals, in the maintainer's priority order

These were ordered by the maintainer: _"most importantly: make filtering easier to use and understand."_

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

An earlier JSON-column recommendation was pushed back on, correctly.

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

The original framing was "improve comms with golbat". The audit sharpened it: today every fort model
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

Measured in production: choppy past 3,000 markers, and timers are the worst part. Two independent
causes were identified, both fixable without a new render engine:

- `ToolTipWrapper` mounts a permanent Leaflet tooltip per marker whose `Timer` re-renders at
  1 Hz, unsynchronised — 3,000 React re-renders per second smeared across every frame.
- `Supercluster` is constructed with `maxZoom: rules.zoomLevel` (15 for Pokémon), so above
  that zoom `forcedLimit` fires, builds a clusterer, and the clusterer declines to cluster.

### G10 — Config that declares shapes instead of enumerating instances _(stated)_

Stated plainly: _"the config is absolutely batshit."_ Measured: 3,574 lines across two hand-mirrored
files defining 611 keys — 5.8 lines of definition per settable key — with only 7 keys
genuinely unreferenced. 45% of leaves are repeated key names.

### G11 — Auth reviewed properly _(stated)_

Done as part of the audit; findings carried into the map. One item deliberately retained by
a deliberate decision and is not tracked further here.

### G12 — Backend in Go _(stated as a question, deliberately unresolved)_

Framed as a question: _"maybe rewrite the backend in GO?"_

**Recommendation carried forward:** not as a wholesale rewrite. Of 23,682 backend lines,
~7,347 are scanner SQL this plan deletes and ~1,960 are the filter engine it replaces —
porting those means translating code already condemned. What remains is IO glue. The
defensible shape is a Go sidecar owning the live index and WebSocket fan-out, with Node
keeping auth and permissions. Decide after the deletions land, because they change the answer.

### G13 — Replace MUI with shadcn/ui _(stated)_

Stated plainly: _"Mui is so heavy on the client and outdated feeling."_

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

Two separate changes, asked for together.

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

### G16 — No obligation to any public surface except the data _(stated)_

The only thing 2.0 owes anyone is **a migration path from the existing ReactMap tables**.
Everything else that exists because it might be depended on can go.

Concretely, all of this is now cut rather than preserved:

- **Dynamic module loading by filepath.** `server/src/routes/api/index.js` does `fs.readdir` then
  `require(resolve(...))` over a directory. A statically-typed codebase cannot see through that,
  and it exists only so a file could be dropped in.
- **The config surface as a compatibility contract.** No option needs to survive because someone
  might be setting it.
- **Configurable ReactMap table names.** Measured: **40 call sites** across 7 source files and
  11 migration files. `userTableName` alone is read 25 times, plus `gymBadgeTableName` 7,
  `backupTableName` 4, `sessionTableName` 3, `migrationTableName` 1. Table names become fixed.

**What the one obligation actually requires.** Because those names were configurable, every
existing deployment has tables called whatever its own config said. So the migration cannot
simply assume canonical names: it has to read the operator's existing config, rename their
tables to the canonical set, and only then hand over to a typed schema. That is a one-time
migration that must run before anything else touches the database, and getting it wrong renames
the wrong tables or misses them entirely. It deserves its own plan and its own tests against a
non-default naming scheme, not a step buried inside another task.

### G17 — uicons.js 3.x _(stated)_

Currently pinned to 2.3.0. **Latest is 3.1.0**, not 3.0 as assumed. Breaking changes between the
majors need reading before the render layer is built on it, since the icon resolver is load
bearing for the atlas pipeline in the map spec.

### G18 — Use the `pogo-masterfile` package _(stated)_

Replaces the hand-rolled `packages/masterfile` and its 830 KB fetch.
`pogo-masterfile` (Hazels-Lab) is on npm at **0.1.46**, described as a runtime API that loads,
indexes and queries masterfile entries.

**Flagging one risk, not objecting:** it is pre-1.0, so its API can still move. Verify it covers
what `packages/masterfile` actually provides (invasions, quest reward types, forms, the rarity
inputs) before the dependency becomes load bearing.

### G19 — Drizzle replaces Knex and Objection _(stated)_

Modern, TypeScript-first, which is the point: the schema becomes types rather than runtime
strings.

The surface is smaller than it looks. Golbat-only deletes every scanner model, so Drizzle only
has to cover ReactMap's own tables: users, sessions, badges, nest submissions, the new filter
and preference tables, and the manual-database nests and portals.

**G16 is a prerequisite, not merely adjacent.** A statically-typed schema and config-driven
table names are mutually exclusive: Drizzle's table definitions are compile-time constants, so
`config.getSafe('database.settings.userTableName')` cannot survive into it. Choosing Drizzle
forces the table-name decision, and that decision was already made.

### G20 — Drop multi-domain _(stated)_

The audit already found it cosmetic: it skins the map per hostname and does not scope auth or
permissions at all. Removes `getMapConfig(req)`, `multiDomainsObj`, the domain branch in
`validateJsons`, and the per-domain config files. Measured: 10 `getMapConfig` references and 15
`multiDomains` references.

### G21 — No untyped baggage _(stated, and it is the umbrella)_

**Measured 2026-08-23, and it is the number this goal is really about: 612 pre-existing type
errors across 139 files.** Surfaced by running `tsc` against the repository for the first time
ever, during the Foundation plan. The cause is that a `@ts-check` pragma forces per-file
checking regardless of `checkJs: false`, and 531 files carry one while nothing has ever run the
compiler. That debt is invisible today and becomes a wall the moment anyone widens the typecheck
gate beyond `app/`. Any plan to convert existing source to TypeScript starts from 612, not zero.

> "I don't want the fully typed codebase to have a ton of untyped baggage due to ReactMap 1.x
> insane decisions."

This is the principle the others are instances of. When something from 1.x resists typing, the
default is to delete it rather than to write types that describe a shape nobody would choose.

### G22 — Express is not a given _(stated as an option)_

Bun ships a native HTTP server with first-class WebSocket support, which is exactly what the
transport work needs and what Express does not have without `ws` bolted on. Hono and Elysia are
the other candidates, both typed and both Bun-friendly.

**The tension worth naming before this is decided.** The client-shape spec's strategy is
greenfield client, greenfield data service, _strangle_ auth and config, because auth's value is
accumulated behaviour nobody wrote down. Passport is Express-shaped, so dropping Express means
rewriting the OAuth plumbing.

The split is more favourable than that sounds. Passport handles the OAuth dance and session
serialisation, roughly 500 lines across `authRouter`, the passport middleware and the three
strategy files. The valuable part, permission computation and role merging and the trial state
machine in `AuthClient` / `DiscordClient` / `TelegramClient` / `Trial`, is around 2,000 lines
and is plain logic that does not care what served the request.

So dropping Express costs the plumbing and keeps the knowledge. That is a real option rather
than a contradiction, but it is a session 3 decision and should be made with the transport
design in front of it, not now.

### G23 — Passport is dead enough to plan around _(established, 2026-08-23)_

Checked against the npm registry rather than assumed:

| package            | latest | published      |                        |
| ------------------ | ------ | -------------- | ---------------------- |
| `passport-discord` | 0.1.4  | 2020-06-04     | **deprecated on npm**  |
| `passport-local`   | 1.0.0  | **2014-03-08** | 12 years old           |
| `passport`         | 0.7.0  | 2023-11-27     | frozen, not deprecated |
| `better-auth`      | 1.7.1  | 2026-08-18     | actively shipping      |
| `arctic`           | 3.7.0  | 2025-05-21     | **deprecated**         |
| `lucia`            | 3.2.2  | 2024-10-20     | **deprecated**         |

The core is frozen rather than dead, but the strategy ecosystem is gone, and strategies are what
this project depends on. `package.json` already carries the proof: `passport-discord` points at
a git fork because the published package is deprecated, and Telegram runs through a scoped fork.

**This weakens the argument for keeping Express.** Part of the case for strangling auth rather
than rewriting it was that passport is load-bearing infrastructure. If it is dead, the plumbing
gets rewritten regardless, on a fork's schedule at whatever moment one breaks, rather than
deliberately.

**Better Auth is the candidate**, and it serves four goals at once: TypeScript-first (G21), a
native Drizzle adapter (G19), framework-agnostic so it does not pin Express (G22), plus Discord
OAuth and session management built in, which would also displace `express-session` and
`express-mysql-session`.

**The split is unchanged and it is the point.** It replaces plumbing, not knowledge. Role-to-
permission mapping, guild and role checks, area restrictions and the trial state machine are
bespoke and port across untouched: roughly 500 lines replaced against roughly 2,000 kept.

Caveats worth carrying: better-auth is 1.x and moving fast, so expect churn. Migrating existing
sessions and users into its schema is real work, though G16 already requires a rename pass over
those tables, so it lands in the same migration rather than being a separate one.

Note for whoever plans this: **Arctic and Lucia are both deprecated.** They are the obvious
suggestions from memory and both are wrong.

### G24 — Local auth becomes a first-class citizen _(stated)_

Today it is an afterthought, and the audit measured exactly how much of one. There is **no
password reset, no email, and no explicit registration**: a grep for reset, forgot, nodemailer
or smtp across the whole repository returns nothing, and `LocalClient.authHandler` silently
creates an account whenever the submitted username does not already exist, using the submitted
password.

**This is the root cause behind the 72-byte lockout, not a coincidence.** That bug was
catastrophic rather than merely irritating because there is nothing to recover through. Fixing
local auth properly retires a whole class of "locked out forever" outcomes instead of patching
them one at a time.

What first-class means here:

- Registration is a deliberate act, not a side effect of a failed login.
- A recovery path exists.
- Linking and unlinking Discord and Telegram to a local account is supported in both directions.
  Some of this exists in `LinkAccounts.jsx`; the audit found the Telegram path does not carry
  badges and the `data` blob across on link while the Discord path does, so the two are not
  symmetric today.

**Open question, and it is the maintainer's call because it lands on every self-hoster:** does
recovery go through email? Email means SMTP configuration and deliverability become an operator
burden on an app that currently sends none. The alternatives are recovery through a linked
Discord DM, which the bot could already do and which requires no new infrastructure, or
operator-issued reset links. This decision shapes G25 as well, because a payment provider that
knows only an email address cannot match a local-auth user who has none.

### G25 — An entitlement API. ReactMap grants access, never handles money  *(stated)*

**The scope boundary, stated first because it decides everything else:** ReactMap ships **no**
payment integration. No Stripe, no Patreon, no Ko-fi, no SDK, no provider-specific webhook
parsing, no signature verification, no prices, no currencies, no invoices, no subscription state
machine, no dependency on any billing service. Anyone who wants that builds it themselves,
outside ReactMap, and calls in.

What ReactMap exposes is a generic, documented API that says: **this user has this permission
until this time.** It does not know or care why. The same endpoint serves a donation processor,
a Patreon sync, a Discord bot, a community reward, or an operator granting access by hand.

That agnosticism is the feature. One mechanism, not one per funding model.

**Vocabulary follows from it.** The API talks about entitlements and permissions and expiry. The
word "payment" should not appear anywhere in the codebase.

The pieces to build on already exist: `perms.donor` with five call sites, `clearNonDonor`,
`donorOnly`, the trial machinery, and lookups by Discord and Telegram id in `api/v1/users.js`.

What is missing or wrong today:

- **No grant, revoke or query endpoint.** Only the trial machinery, and `api/v1/trial.js`
  mutates state through `GET /start`, which no external caller should be asked to invoke.
- **Authentication is one shared secret** compared with `!==` rather than a constant-time
  comparison, and the same secret gates a route with raw SQL interpolation. Scoped, rotatable,
  per-integration API keys instead.
- **Idempotency.** Retries are a fact of any webhook sender's life. Granting twice must not
  extend twice.
- **Identity matching is the hard part.** An external caller knows an email address or a Discord
  id; ReactMap knows its own user ids and whatever accounts happen to be linked. The Discord and
  Telegram lookups cover part of it, and G24's answer on email decides the rest.

**A stable contract raises the bar, and this is the trade being made deliberately.** Because
third parties will build against it, the API cannot be casually reshaped later and its
authentication has to hold up against integrations whose code quality ReactMap does not control.
That is a real ongoing obligation, accepted on purpose.

**Not a contradiction with G16.** G16 refuses to preserve surface that became public by
accident: dynamic file loading, config keys, table names nobody designed as an interface. This
is a designed, documented, versioned interface. Deliberate is the opposite of accidental.

**This depends on a defect the audit already found, and cannot ship without it.** Permissions
are computed once at login and frozen into the session; revocation never reaches a live session,
and `mergePerms` OR-merges booleans so a once-true permission cannot be revoked by a later
merge. An entitlement API that can grant but not revoke is worse than no API at all. The
permission model has to become live-computed, or gain an explicit per-provider invalidation
hook, before this is safe to expose.

---

## 3. Constraints

### Stated

- **Breaking changes are allowed.** This is a major version.
- **Golbat is maintained by the same person**, so Golbat-side changes are in scope — and three of the four
  longest poles turn out to live there.
- **ReactMap ships to third-party operators.** Self-hosted, multi-tenant, own configs. Any
  migration has to work for operators who are not the maintainer.
- **Production Golbat caps:** 5,000 pokemon results, forts at default. ReactMap currently
  requests 35,000.
- **Gym badges reach a few thousand per user**, against Golbat's 500-id query cap which
  returns 413 rather than truncating. Batching is a prerequisite, not an optimisation.
- **`fort_in_memory=false` is no longer run** on the maintainer's own deployments.

### Assumed — confirm before planning

- **A1 — Migration strategy: greenfield client, greenfield data service, strangled auth/config.**
  The stated lean was greenfield (_"just write 2.0 in place alongside 1.0"_) and two adversarial passes
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
- **Not preserving any public surface except the data.** See G16. The migration path from existing tables is the whole obligation.
- **Not keeping config-driven table names.** They are incompatible with a typed schema.
- **Not a multi-provider webhook abstraction.** G14 — it was built for backends that never arrived.
- **Not a component library swap in place.** G13 lands with the greenfield client, not as a 204-file migration on 1.x.
