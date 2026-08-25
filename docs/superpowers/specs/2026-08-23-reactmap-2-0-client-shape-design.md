# ReactMap 2.0 — Client Shape

**Date:** 2026-08-23
**Written against:** `90f94e63`, branch `c/project-2-0-audit-49a89f`
**Session:** 1 of 3
**Inputs:** `docs/systematic-refactor/refactor-workspace/{trace,goals,assessment,map}.md`

---

> **Partly superseded.** Three sections of this spec were overtaken by later decisions and are
> marked inline below: rule ordering (section 4), the MapJS DSL (section 4), and coexistence
> (section 6). Where this document and a later one disagree, the later one governs. See
> `2026-08-24-reactmap-2-0-rules-model-design.md`, `2026-08-24-reactmap-2-0-no-coexistence.md`
> and `2026-08-24-upstream-validation-corrections.md`.

## Scope

This spec covers the **shape of the 2.0 client**: information architecture, design language,
component strategy, map rendering, the Filters/Alerts interaction, client state, tooling and
testing.

It deliberately excludes two things, each of which gets its own session:

- **Session 2 — the rules model.** Rule schema, the filter tables, server-side evaluation for
  query-shaping and push-matching, the reverse index, and migration from the 1,489 per-form
  entries.
- **Session 3 — transport.** WebSocket protocol, delta semantics, the contracts package, the
  Golbat consumer, and the Go-versus-Node decision for the data service.

The client shape does not depend on either. `useEntities` is fed through a data-source
interface; whether that is a socket or a poll is session 3's problem.

---

## Goals served

From `goals.md`, this session addresses G7 (TypeScript), G8 (mobile), G13 (shadcn), G14
(Poracle single-provider, own surface), G15 (landing page, `/map`), and the client half of
G1 (filters people can understand) and G9 (performance at real marker counts).

---

## 1. Information architecture

```
/                 Hub          nav to everything; later, PoGo + OSS ecosystem news
/map              Map          search in the top bar · @/:lat/:lon deep-link alias
/filters          Filters      ReactMap's own · violet
/alerts           Alerts       Poracle's own · pink · degrades independently
/profile          Me           account, linked accounts, permissions, badges, reset
/locales          Translators  top-level, not admin
/playground       Admin        the only admin-gated route
/login  /reset  /blocked/:info
```

**Mobile bottom nav:** Map · Filters · Alerts · Me. Search lives in the map's top bar; the hub
sits behind the logo.

**The hub is a hub, not a marketing page.** Navigation to the other surfaces first, later an
aggregated feed of PoGo news and open-source ecosystem releases. Always on for every operator.
The news feed is a later phase and is not specified here — `checkForUpdates.js` is a git-branch
version checker, not a seed for it.

**Every route is a lazy chunk.** Bundle strategy is a consequence of the IA rather than a
separate exercise. The map route carries MapLibre and deck.gl; nothing else does.

### Deleted by this IA

- `/data-management` folds into `/profile` as a reset action.
- **Backups** dies entirely (confirmed: the transport spec listed it among surviving procedures, which was an error) — the `Backup` model, the `backups` table, `Backups.jsx`. Filter
  sets supersede it once preferences are server-side.
- **The tutorial** dies. 1,087 lines nobody read. Empty states teach instead.
- Poracle as a modal mounted from `Nav.jsx` dies.
- `HookSelection.jsx` dies with single-provider.

---

## 2. Design language

**Direction: C2, "characterful".** Cute and memorable over functional and boring, which was the
explicit brief.

| Token group      | Value                                                         |
| ---------------- | ------------------------------------------------------------- |
| Display / labels | Fredoka                                                       |
| Body, UI, data   | Nunito, `tabular-nums` on anything numeric                    |
| Accent           | `#7B5CE0 → #E067A8` — violet end for Filters, pink for Alerts |
| Radii            | Generous                                                      |
| Themes           | Light and dark from one CSS-variable set on `:root`           |

**The data palette is a separate token group and is never derived from the accent.** Team
colours, league colours and IV tiers are a language on the map surface and must keep meaning
what they mean. Kept in a different file so nobody harmonises them later.

**Motion** is springy — cards settling, a sparkle on a hundo — via `motion`. All of it respects
`prefers-reduced-motion`.

### Components

From the shadcn registry: `drawer` (Vaul — the peek-sheet physics), `sheet` + `resizable`
(desktop editor), `slider` (Radix, multi-thumb, for IV/CP/level), `command` (map search),
`empty` (the teaching empty state), plus `tabs`, `select`, `badge`, `card`, `switch`,
`collapsible`, `sonner`, `skeleton`, `spinner`, `sidebar`.

Ours, because nothing in the registry covers them:

- **Virtualised selector grid** — keep `react-virtuoso`, restyle. It works today; a toggle
  re-renders one cell, not the list.
- **Bottom nav bar** — `sidebar` is desktop-only.
- **The filter sentence editor** — composed from `popover` + `slider` + `command`, but the
  sentence is ours.

**Icons:** `lucide-react`, tree-shaken per icon, replacing 82 `@mui/icons-material` imports.
Game iconography stays UICONS images — it was never an icon font.

**Dependency delta:** out go `@mui/material`, `@mui/icons-material`, `@mui/lab`,
`@emotion/react`, `@emotion/styled`. In come `tailwindcss` v4, per-component Radix primitives,
`lucide-react`, `vaul`, `motion`. shadcn components are copied into the tree — source we own.

---

## 3. Map rendering

**MapLibre GL JS** owns the basemap and camera. **deck.gl** rides on it via `MapboxOverlay` in
**interleaved** mode, so markers sit beneath street labels rather than covering them.

### Tile sources

Requiring every self-hoster to obtain a MapTiler key would be a regression from today's
configurable raster `tileServers`. Therefore:

- Default to a **keyless vector source** (OpenFreeMap, or PMTiles served from the operator's own
  host for zero external dependency).
- **Keep raster support.** MapLibre renders raster sources natively, so existing `tileServers`
  entries keep working through the same config field.

### Layers

| Layer                                  | Type                             | Rationale                                    |
| -------------------------------------- | -------------------------------- | -------------------------------------------- |
| Pokémon                                | `IconLayer` + `TextLayer`        | thousands per viewport — the count problem   |
| Gyms, stops, stations, tappables       | `IconLayer`                      | hundreds; composited icons, high atlas churn |
| Routes                                 | `PathLayer` + arrowhead geometry | `leaflet-arrowheads` has no equivalent       |
| S2 cells, scan areas, submission rings | `PolygonLayer` / `GeoJsonLayer`  | direct port                                  |
| Interaction ranges                     | `ScatterplotLayer`               | radius in metres, native                     |

### The atlas pipeline

`IconLayer` auto-packs when `getIcon` returns `{id, url, width, height, anchorY}` — no
hand-built atlas required.

```
composite key   (pokemonId, form, costume, gender, badges, background, weather)
      ↓ cache miss
OffscreenCanvas — draw sprite + overlays exactly as the CSS does today
      ↓
data URL, cached by key (LRU-bounded)
      ↓
getIcon returns it; deck.gl packs and uploads
```

Distinct combos in one viewport land in the low hundreds and repeat heavily, so hit rate should
be high after a few seconds of panning. `UAssets` URL resolution is unchanged — it still
produces sprite URLs; we composite them instead of the browser.

### Text, picking, clustering, context loss

- **Text** — IV, level, size, cluster counts and countdowns are all `TextLayer` data. One array
  update per second covers every visible timer. This structurally eliminates the measured
  "reallllly choppy" 1 Hz per-marker React re-render; it is not an optimisation of it.
- **Picking** replaces marker refs, `popupopen`/`popupclose`, `useForcePopup` and
  `useMarkerTimer`. One React popup at a time, positioned by projecting the picked coordinate.
- **Clustering** — Supercluster stays, feeding layer data. `forcedLimit` gets fixed to actually
  bound; today it builds a clusterer that declines to cluster above `maxZoom`.
- **Context loss** — `webglcontextlost` / `webglcontextrestored` handlers rebuild layers and
  re-warm the atlas cache behind a visible "restoring map" state. New surface; most likely to
  bite on iOS under memory pressure.

---

## 4. Filters and Alerts

### The governing constraint

> **Shared interaction grammar. Independent data. Explicit provenance.**

One system to learn. ReactMap owns its filters top to bottom and works with Poracle offline.
Always obvious which one you are touching, seamless to move between, syncable on demand,
self-explanatory without a tutorial.

### Identical twins, separate tabs

Filters and Alerts are the **same component with different data and a different accent**. Not
one editor with a toggle — separate tabs, because the systems are genuinely separate and a
toggle is the thing most likely to make someone edit the wrong list.

- Filters — violet, "What shows on your map", ReactMap's own tables.
- Alerts — pink, "What Poracle DMs you", Poracle's own. Greys out when Poracle is unreachable;
  the map does not notice.
- ReactMap **never reads Poracle's database or couples to its schema**. It calls Poracle's HTTP
  API and maps the response into the shared view model at the boundary, exactly as
  `Poracle.processor()` does today.

**Where each list actually lives — the two halves are not symmetric, and the UI hides that
deliberately:**

|                   | Filters                            | Alerts                        |
| ----------------- | ---------------------------------- | ----------------------------- |
| Owner             | ReactMap                           | Poracle                       |
| Storage           | ReactMap's DB (session 2's tables) | Poracle's own DB, via its API |
| Offline behaviour | works — no dependency              | greys out; map unaffected     |
| Profiles          | ReactMap's own                     | Poracle's own                 |

The **interaction** is identical; the **ownership** is not. That asymmetry is why they are two
tabs rather than one toggle, and why copying between them is an explicit push or pull rather
than a sync.

### A filter

> **Superseded by the rules model spec.** Rules have no order, no `position` column, and no drag
> handles. Each display property resolves independently: notify is OR, size takes the maximum, and
> glows paint ring segments. First-match-wins was rejected because a Pokémon matching a size rule
> and a glow rule got the size and lost the glow, discarding intent the user had expressed. The
> question this was meant to answer, "why is this one big", is answered instead by a marker popup
> naming every rule that matched. This paragraph is kept for the reasoning, not as the decision.

A name and a sentence. Drag to reorder; **first match wins the display treatment**, which is
what finally answers "why is this one big and that one small".

```
Hundos                                    ↔ also an alert
Any Pokémon with IV 100% · XL gold icon
```

### The sentence is the editor

Tapping a card opens a sheet over the map. Every underlined span is a tap target:

> Show **any Pokémon** with **IV 100%** as an **XL gold icon**

- **any Pokémon** → species and form picker (the virtualised grid)
- **IV 100%** → condition editor; `+` adds another; conditions AND together
- **XL gold icon** → size, glow, notification

Alerts use the same grammar with a different tail:

> DM me for **any Pokémon** with **IV 100%** within **5 km**

**List is a tab, editing is a sheet.** Full-screen for managing and reordering; sheet over the
map for tuning one filter so markers respond as you drag.

### The MapJS DSL survives as a notation, not a mode

> **Superseded by the rules model spec.** The DSL is deferred entirely from 2.0: no Sentence and
> Text toggle, no live echo, no parser. Shipping two ways to express the same filter was judged
> worse than shipping one, and the round-trip success criterion below no longer applies. The parser
> and its `vm.runInNewContext` call stay where they are in 1.0; 2.0 simply never imports them, so
> the security win claimed here still holds by a different route.

Power users depend on it, and the DSL and the rule model already express the same shape —
`dnfifyIvFilter` converts a string into DNF clauses today, and a DNF clause is a rule.

A **Sentence ⇄ Text** toggle, one row at the bottom of the editor. Text mode swaps the sentence
block rather than adding to it, so the sheet is the same height either way.

**In Text mode, the sentence is echoed underneath as you type.** That echo is the mechanism, not
the toggle: a power user typing `(90-100&L30-35)|GL1-10` watches the sentence appear; a
newcomer who flips to Text sees their filter as a string. The two notations teach each other
continuously — the job the tutorial was failing at.

Consequences:

- The string is parsed **client-side into rules**. It never reaches the server.
- One evaluation path. No `onlyLegacy` branch, no third mode.
- **No `vm.runInNewContext` anywhere.** That security finding disappears as a side effect.
- The string covers **conditions only** — display treatment stays in the UI.
- Negation and arbitrary nesting do not round-trip, because `dnfifyIvFilter` already drops them
  when flattening to DNF. The editor **names what it dropped and offers undo**; today the same
  term is discarded silently on any Golbat-backed source.

### Twins, profiles, empty state

- **Twins.** A filter with a counterpart shows `↔ also an alert`; tapping offers **Push
  changes** or **Pull changes**. Copies stay copies. Deliberately effortful — the alternative is
  people believing one edit changed both.
- **Profiles** are per-system, mirroring the concept rather than sharing data. Same control in
  both headers, independent contents. Each owns its areas, location and list. Zero areas means
  no area filtering; location defaults to the last map position.
- **The empty state teaches.** Four one-tap starting points — 100% IV, Great League, Shiny
  families, Rare spawns — that create _real, editable_ filters. Someone who taps one has a
  working filter and a worked example at once.
- **Match count** appears inside the editor while a control is being dragged, and nowhere else.

### Dies here

Basic/intermediate/expert modes, `onlyLinkGlobal` inheritance, `ModeSelector.jsx`, and
`FilterHelp.jsx` (537 lines). A MapJS importer survives one release.

---

## 5. Client state

**`zustand-dot`** as the store layer — `dotPath()` middleware with `usePath` / `setPath` /
`getPath` / `resetPath`. `setPath` does structural sharing, so the current `setDeep`
mutate-what-you-were-handed trap does not carry forward.

**Five stores replacing one:**

| Store            | Contents                                      | Persistence                                             |
| ---------------- | --------------------------------------------- | ------------------------------------------------------- |
| `usePreferences` | settings, icons, audio, display options       | ReactMap's DB — table defined in session 2              |
| `useLocal`       | tabs, expanded, search text, sheet snap point | localStorage, `partialize`d                             |
| `useMapState`    | camera, viewport, picked object, hover        | never persisted                                         |
| `useFilters`     | twin store shape, instance 1                  | **ReactMap's DB**                                       |
| `useAlerts`      | twin store shape, instance 2                  | **Poracle's API** — cached client-side, written through |
| `useEntities`    | live map data by id                           | never persisted                                         |

**Filters and Alerts are the same store factory instantiated twice**, with different persistence
adapters injected — ReactMap's DB for one, Poracle's API for the other. That is how "one system
to learn" is enforced in code rather than by discipline: divergence in the _shape_ becomes a
compile error, while the _ownership_ difference stays isolated in the adapter.

**Normalized: `byId` + `order[]`.** Lists map over `order` and render `<FilterCard id={id} />`;
each card selects its own row. Pass the id, never the object.

### Subscription rules

Per the measured benchmark: subscribe to the **narrowest value in the component that uses it**.
Per-field selectors hoisted into a parent is the worst measured pattern (N+1 renders, ~4N
selector evaluations); wide `useShallow` feeding props is worse than naive whole-object
subscription. `usePath` satisfies this as long as it is called in the consuming component.

**deck.gl changes what these rules apply to.** Markers stop being React components, so the
thousands-of-subscribers case does not arise. The rules govern the chrome. But deck.gl creates
the _other_ case the benchmark flags: an expensive selector in many subscribers costs up to
~488× deriving once. Therefore layer data is derived **once**, in a single memoized selector
feeding the overlay — never inside components.

```
transport ──▶ useEntities (byId)
                    │
              one memoized derivation  ◀── useFilters (active profile)
                    │
              deck.gl layer props ──▶ MapboxOverlay
```

React renders the chrome. The map is data, not a tree.

### Making `zustand-dot` comfortable

The IDE slowdown is a `Paths<T>` union-size problem: the union is the cross-product of every
branch at every depth, computed per store, then distributed over at every call site twice.

1. **Splitting the stores is the fix.** Growth is multiplicative, so five 2–3-level stores are
   orders of magnitude smaller combined than one 5-level store.
2. **`Record<string, T>` for data-driven keys** — yields one `byId.${string}` branch rather
   than a branch per key. Bounded by shape, not data.
3. **Depth limiter** capping recursion at 3–4 levels, falling back to `string`. This coincides
   with the library's own measured runtime cliff at four levels (1.75× read, 2.52× write), so
   the type limit and the performance limit agree: if a path is deep enough to be slow, it is
   deep enough to stop type-checking.
4. **Literal guard** — `string extends S ? string : Paths<T>` so a `string` variable passed as a
   path does not detonate the recursion.

Plus named intermediate aliases (the compiler caches those) and `[T] extends [U]` tuple-wrapping
where distribution is unwanted.

**Verify with `tsc --generateTrace` before and after** — that is how you know the union shrank
rather than quietly widening to `string`, which would disable validation with no error.

These are upstream improvements to `zustand-dot`, not ReactMap forks.

---

## 6. Tooling

|                                       |                                                                                                |
| ------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Language                              | TypeScript, `strict` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` from line one |
| Typecheck                             | `tsc` in CI and pre-commit; `vite-plugin-checker`'s typescript block uncommented               |
| Lint + format                         | **Biome** — `"format": "biome check --write --unsafe"`, `"lint": "biome check"`                |
| Styling                               | Tailwind v4, CSS-first config, tokens as `:root` variables                                     |
| Runtime, package manager, test runner | **Bun**                                                                                        |
| Build                                 | Vite, two entries                                                                              |

### Bun

Blast radius is one file. `bcrypt` is the only native dependency, used at
`server/src/services/LocalClient.js:4` and nowhere else; **`Bun.password` handles bcrypt hashes
natively**, so the switch removes a native dependency rather than fighting one. `node-fetch@2`
also goes, since Bun has `fetch` built in. Everything else in the tree is pure JS.

**The real cost is not technical.** Every self-hosting operator needs Bun, and the Docker image
changes. That lands on the same people as the 2.0 migration itself and should be sequenced
deliberately.

### Coexistence

> **Superseded by the no-coexistence spec.** 2.0 is never deployed to production before it is
> merged; operators run it alongside at a separate host. So the 2.0 server does not serve the 1.0
> client, and nothing on the v2 branch keeps 1.x working. The two-entry build and the per-user
> shell flag still exist and are harmless, but the architecture described below is not the plan.
> Of 27 root causes found while building auth against this model, 20 came from touching 1.x.

Two Vite entries from one config: `index.html` → `src/` (1.0), `app.html` → `app/` (2.0). One
server, both bundles in `dist/`. A per-user flag on the users table decides which shell is
served — same cookie, same session, same permissions endpoint. This is what lets 2.0 ship at
30% complete instead of becoming a branch that dies.

### Cut

**`.custom.jsx` operator overrides and the `customFile` Vite plugin are removed.** The mechanism
let operators silently replace any source file at build time, which a restructured tree would
break with no compiler signal. Removed deliberately rather than lost by omission.

**Yarn 1.22** is replaced by Bun, resolving its unmaintained status as a side effect.

---

## 7. Testing

Zero frontend tests exist today; 53 backend tests in 6 files. **TDD from the start** — test
first, in every plan, despite the current codebase doing almost none.

The bar is not coverage percentage. It is **cover the things whose breakage is silent.**

- **Vitest + Testing Library** for units and components.
- **Playwright** for four flows: cold load, create a filter, copy a filter to Alerts, deep-link
  into a marker.

Four things that genuinely need tests, each chosen because failure is invisible:

1. **DSL round-trip, property-based.** `fast-check` generates a random rule → serialise → parse
   → compare. Covers the whole class of round-trip bugs in one test. The DSL is now the interop
   format users share in Discord; silent corruption there is the worst available outcome.
2. **Rule → Golbat DNF translation.** Characterisation tests seeded from `filters/fort/*`,
   which encode real incidents — the accumulated-keys 997-stop over-return is a bug already paid
   for once.
3. **Store reducers and path types.** Reference-identity tests (sibling keys unchanged, path
   keys new) plus type tests, so a `Paths<>` change that widens to `string` fails loudly rather
   than silently disabling validation.
4. **Atlas cache keying.** A colliding key renders the wrong icon; an over-specific one blows
   the cache. Both silent.

**Not tested:** vendored shadcn components (upstream's job), visual pixel diffs (high
maintenance, low signal), anything with a coverage target attached.

The output-parity harness — golden 1.0 responses replayed against 2.0 — belongs to session 3.

---

## Assumptions

Carried from `goals.md`, confirmed or still open:

- **A1 — greenfield client.** Confirmed by arithmetic: 204 of 415 client files import MUI, 35
  import react-leaflet with no abstraction, every file converts to TypeScript, and the filter UI
  is replaced. No meaningful subset remains to strangle. The server and data-service half of A1
  remains open and belongs to session 3.
- **A2 — 1.0 and 2.0 share a session.** Assumed, and made concrete by the two-entry build above.
- **A3 — testing is a prerequisite.** Confirmed; TDD is now explicit.
- **A4 — render layer.** Resolved: MapLibre + deck.gl, fully, now.

Still genuinely unknown and not resolvable from the code: **timeline**, **who else works on
this**, and the **third-party operator upgrade path** — the last of which now also carries the
Bun requirement.

---

## Success criteria

1. `/`, `/map`, `/filters`, `/alerts`, `/profile` render from `app/` behind a per-user flag,
   sharing 1.0's session.
2. `bun run lint` and `tsc --noEmit` pass with `strict`, enforced in CI and pre-commit.
3. A dense viewport holds a steady frame rate while panning with timers enabled — the specific
   condition measured as choppy today.
4. A filter can be built by sentence, viewed and edited as a MapJS string, and round-trips
   losslessly for everything DNF can express.
5. A filter can be copied to Alerts, and the copy is visibly a copy.
6. Someone who has never used ReactMap can create a useful filter from the empty state without
   documentation.
7. No `@mui/*`, `@emotion/*`, `leaflet`, `react-leaflet`, or `vm.runInNewContext` in `app/` or
   its server surface.

---

## Note for writing-plans

This spec is **too large for a single implementation plan** and should be decomposed. The
natural seams, in dependency order:

1. **Foundation** — Bun, Biome, `tsconfig` strict, Tailwind v4, the two-entry build, CI gates.
2. **Shell and IA** — routes, bottom nav, hub, `/profile`, session sharing with 1.0.
3. **Design system** — tokens, shadcn install, the components we own.
4. **Map engine** — MapLibre + deck.gl, layers, atlas pipeline, picking, context loss.
5. **Filters UI** — sentence editor, DSL toggle, twins, empty state. _Depends on session 2._

Items 1–4 do not depend on sessions 2 or 3 and can start immediately.

---

## Next

Session 2 — the rules model — is the direct dependency of everything in section 4. Session 3 —
transport — depends on session 2's rule shape for the reverse index.
