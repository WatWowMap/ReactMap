# Map Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder at `/map` with a real map: MapLibre owning the basemap and camera, deck.gl riding it in interleaved mode, an atlas pipeline that composites marker icons off the main thread, and text rendered as layer data rather than as thousands of React components.

**Architecture:** MapLibre GL owns the canvas. deck.gl attaches through `MapboxOverlay` in interleaved mode so markers sit beneath street labels. Marker icons are composited on an `OffscreenCanvas`, keyed by the combination that determines their appearance, and cached under an LRU bound. Layer data arrives through a source interface that this plan backs with fixtures; session 3 implements the real transport behind the same interface.

**Tech Stack:** maplibre-gl 6.5.0, deck.gl 9.3.10, supercluster 8.0.1 (already present), React 19, TypeScript strict.

## Assumptions

Five calls made while writing this plan, each stated because a reader could expect otherwise.

1. **Data comes from fixtures behind an interface, not from a server.** The 2.0 client has no marker data source today; nothing in `app/` fetches map data at all. The spec places transport in session 3 and says plans 1 to 4 do not depend on it, which can only mean the engine is built against an interface and fed fixtures. This plan defines that interface. Session 3 implements it. Getting the interface shape wrong is the main risk here, so it stays deliberately small.
2. **Two layers, not five.** Pokémon, because thousands per viewport is the actual hard problem and the reason for this rewrite, and gyms as a plain `IconLayer` to prove the pattern generalises without the text and clustering machinery. Routes, S2 cells and interaction ranges follow the same shape and land with the features that need them, against entity shapes session 3 defines rather than shapes invented here.
3. **The basemap defaults to a keyless vector source and raster keeps working.** Requiring every self-hoster to get a MapTiler key would be a regression from today's configurable raster `tileServers`. MapLibre renders raster natively, so existing entries keep working through the same config field.
4. **1.0's map is untouched.** `src/` keeps Leaflet, react-leaflet and every marker component. Nothing here changes what current users are served, and the per-user shell flag stays off.
5. **No timers are ported.** The measured "reallllly choppy" behaviour is thousands of React components each re-rendering on a 1 Hz interval. Moving text into `TextLayer` data eliminates that structurally rather than optimising it, so there is no per-marker timer component to port and none should be written.

## Global Constraints

- Nothing under `src/` or `server/` changes.
- `app/` is strict TypeScript with `exactOptionalPropertyTypes`. The vendored shadcn components are patched to satisfy it; new code must satisfy it too.
- Exactly ONE dark mechanism, the `prefers-color-scheme` media query. No `.dark` class variant; it has been stripped from this branch three times.
- Map entity colours come from `app/tokens/data-palette.css` and never from the brand accent. That file is a language about map data and a test enforces its separation, including by literal value.
- Any new colour pair needs its WCAG contrast computed in both themes. No gate in this repo can see contrast; a green suite proves nothing about it.
- Component tests scope queries to their own render container and clean up after each test.
- Do not add a `preload` to `bunfig.toml`. It is process-wide and broke three Node-side suites.
- Prose in commits carries no em dashes, no bold, no inline bulleted headers, and never refers to the maintainer by name.
- The pre-commit hook runs `biome check` and `tsc -p tsconfig.app.json --noEmit` and blocks on either.

---

## File Structure

```
app/
  map/
    types.ts            the source interface, entity shapes, viewport
    source.ts           fixture-backed implementation of that interface
    fixtures.ts         generated entities, enough to exercise the count problem
    atlas.ts            composite key, OffscreenCanvas draw, LRU cache
    atlas.test.ts       keying and eviction, the silent-failure surface
    useMapLibre.ts      map instance, camera, deep-link sync
    layers.ts           deck.gl layer construction from source data
    MapCanvas.tsx       the map itself, overlay attached
    Popup.tsx           the single React popup, positioned from a picked coordinate
  pages/
    MapPage.tsx         renders MapCanvas instead of a placeholder
```

---

## Task 1: The source interface and its fixtures

**Files:**
- Create: `app/map/types.ts`, `app/map/fixtures.ts`, `app/map/source.ts`
- Test: `app/map/source.test.ts`

**Interfaces:**
- Produces: `MapSource`, consumed by every later task and implemented for real in session 3.

This comes first because everything else depends on its shape, and because getting it wrong is the expensive mistake in this plan.

- [ ] **Step 1: Write the failing test**

Create `app/map/source.test.ts`:

```ts
import { expect, test } from 'bun:test'
import { createFixtureSource } from './source'

test('returns only entities inside the requested bounds', async () => {
  const source = createFixtureSource()
  const inside = await source.query({
    kind: 'pokemon',
    bounds: { west: -0.1, south: 51.5, east: 0.1, north: 51.6 },
    zoom: 15,
  })
  expect(inside.length).toBeGreaterThan(0)
  for (const entity of inside) {
    expect(entity.lon).toBeGreaterThanOrEqual(-0.1)
    expect(entity.lon).toBeLessThanOrEqual(0.1)
    expect(entity.lat).toBeGreaterThanOrEqual(51.5)
    expect(entity.lat).toBeLessThanOrEqual(51.6)
  }
})

test('produces enough pokemon to exercise the count problem', async () => {
  const source = createFixtureSource()
  const all = await source.query({
    kind: 'pokemon',
    bounds: { west: -1, south: 51, east: 1, north: 52 },
    zoom: 12,
  })
  expect(all.length).toBeGreaterThanOrEqual(3000)
})
```

- [ ] **Step 2: Run it to verify it fails**

```bash
bun test app/map/source.test.ts
```

Expected: FAIL, cannot find `./source`.

- [ ] **Step 3: Define the types**

`app/map/types.ts` holds a `Bounds`, a `MapQuery` carrying kind, bounds and zoom, an entity union, and:

```ts
export interface MapSource {
  query(request: MapQuery): Promise<MapEntity[]>
}
```

The pokemon entity needs whatever the atlas keys on: id, form, costume, gender, plus lat, lon, an expiry timestamp, and optional iv, level and size. The gym entity needs id, lat, lon, team and an in-battle flag. Keep both minimal. Every field added here is a field session 3 has to honour.

- [ ] **Step 4: Write the fixtures and the source**

Generate deterministically, seeded, so tests and visual checks are reproducible. Three thousand pokemon is the floor the test asserts, since the whole point of this engine is the count problem and a fixture set of thirty proves nothing.

- [ ] **Step 5: Run the tests to verify they pass**

Expected: PASS, 2 tests.

- [ ] **Step 6: Commit**

```bash
git add app/map/ && git commit -m "feat(map): define the source interface and its fixtures"
```

---

## Task 2: The atlas pipeline

**Files:**
- Create: `app/map/atlas.ts`
- Test: `app/map/atlas.test.ts`

**Interfaces:**
- Consumes: the pokemon entity from Task 1.
- Produces: `getIconFor(entity)` returning what `IconLayer`'s `getIcon` needs.

The spec calls this out as one of four things that genuinely need tests, because both failure modes are silent: a colliding key renders the wrong icon, an over-specific key destroys the hit rate.

- [ ] **Step 1: Write the failing test**

Cover the two silent failures directly. Two entities differing in any appearance-determining field must produce different keys. Two entities differing only in a field that does not affect appearance, such as position or expiry, must produce the SAME key. Then assert the cache evicts under its bound rather than growing without limit.

- [ ] **Step 2: Run it to verify it fails**

Expected: FAIL, cannot find `./atlas`.

- [ ] **Step 3: Implement the key and the cache**

The key is the combination the spec names: pokemon id, form, costume, gender, badges, background, weather. The cache is LRU with an explicit bound. `OffscreenCanvas` is not available in the test environment, so structure the module so the key function and the cache are testable without it and the drawing is injected. That separation is the point: keying is what has silent failure modes, and drawing is what needs a browser.

- [ ] **Step 4: Run the tests to verify they pass**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/map/ && git commit -m "feat(map): composite marker icons behind an lru cache"
```

---

## Task 3: MapLibre basemap and camera

**Files:**
- Create: `app/map/useMapLibre.ts`, `app/map/MapCanvas.tsx`
- Modify: `app/pages/MapPage.tsx`, `package.json`

- [ ] **Step 1: Install**

```bash
bun add maplibre-gl
```

Verified at 6.5.0. Note `[install] exact = true`; do not add carets by hand.

- [ ] **Step 2: Render a map**

`MapCanvas` mounts a MapLibre instance into a container sized to the viewport minus the bottom nav. Default to a keyless vector style. Import MapLibre's stylesheet; without it the canvas renders but every control is unstyled and positioning breaks.

- [ ] **Step 3: Wire the deep link**

`/@/:lat/:lon/:zoom` already exists in 1.0 and those links are in the wild. The 2.0 route table owns `/map`; decide deliberately how a deep link reaches it and say what you chose. Camera changes should update the URL without pushing a history entry per frame.

- [ ] **Step 4: Confirm it builds and the route still lazy-loads**

```bash
bun run build && ls dist/ | grep -c MapPage
```

Expected: non-zero, and MapLibre must land in the map route's chunk or a shared vendor chunk, NOT in the entry. The whole point of lazy routes is that a visitor to the hub does not download a mapping library. Check which chunk grew.

- [ ] **Step 5: Commit**

```bash
git add app/ package.json bun.lock && git commit -m "feat(map): render the basemap and sync the camera"
```

---

## Task 4: The deck.gl overlay, interleaved

**Files:**
- Create: `app/map/layers.ts`
- Modify: `app/map/MapCanvas.tsx`, `package.json`

- [ ] **Step 1: Install**

```bash
bun add deck.gl @deck.gl/mapbox @deck.gl/layers @deck.gl/core
```

All verified at 9.3.10.

- [ ] **Step 2: Attach the overlay**

`MapboxOverlay` with `interleaved: true`. Interleaved is not cosmetic: it is what puts markers beneath street labels instead of over them, and it is the reason this rides MapLibre rather than replacing it.

- [ ] **Step 3: Build the pokemon and gym layers**

`IconLayer` for both, `TextLayer` for pokemon labels. Icons come from Task 2's atlas. Gym colours come from the data palette's team tokens, read at runtime; those tokens ship only because their block is marked static, and a value read here that resolves to nothing renders a colourless marker without erroring.

- [ ] **Step 4: Verify the interleaving actually happened**

A screenshot is not available, so assert on the overlay's configuration and say plainly that visual confirmation is outstanding. Do not claim markers sit under labels without having seen it.

- [ ] **Step 5: Run everything and commit**

```bash
bun test && bun run typecheck && bun run lint && bun run build
```

---

## Task 5: Picking and the single popup

**Files:**
- Create: `app/map/Popup.tsx`
- Modify: `app/map/MapCanvas.tsx`

- [ ] **Step 1: Wire picking**

deck.gl's picking replaces marker refs and Leaflet's popup events. One popup exists at a time, positioned by projecting the picked coordinate through the camera.

- [ ] **Step 2: Keep it correct while the camera moves**

A popup anchored to a coordinate must follow that coordinate on pan and zoom. Decide whether it reprojects per frame or rides a MapLibre marker, and say which and why.

- [ ] **Step 3: Test what is testable without a GPU**

Picking needs a real WebGL context. Test the popup component itself with a fixed projected position, and the selection state transitions. State plainly what needs a browser.

- [ ] **Step 4: Commit**

---

## Task 6: Clustering, and fix `forcedLimit`

**Files:**
- Modify: `app/map/layers.ts`
- Test: `app/map/clustering.test.ts`

- [ ] **Step 1: Write the failing test**

The spec records a real bug: `forcedLimit` is supposed to bound how many markers render, and today it builds a clusterer that declines to cluster above `maxZoom`, so the bound does not bind. Read the 1.0 implementation in `src/` first to understand what it does, then write a test asserting the count actually stays under the limit at high zoom with more entities than the limit.

- [ ] **Step 2: Run it to verify it fails against the ported behaviour**

If it passes immediately, you have ported the bug rather than the behaviour, or the test does not reach the path. Investigate before proceeding.

- [ ] **Step 3: Fix it and make the test pass**

- [ ] **Step 4: Commit**

---

## Task 7: WebGL context loss

**Files:**
- Modify: `app/map/MapCanvas.tsx`, `app/map/atlas.ts`

New surface, most likely to bite on iOS under memory pressure, and invisible until it happens to a user.

- [ ] **Step 1: Handle the events**

`webglcontextlost` and `webglcontextrestored`. On loss, show a visible restoring state rather than a blank canvas. On restore, rebuild layers and re-warm the atlas cache.

- [ ] **Step 2: Test the state machine, not the GPU**

Context loss can be simulated by dispatching the events. Assert the restoring state appears and clears, and that the atlas is asked to rebuild. Do not attempt to actually lose a real context in a test.

- [ ] **Step 3: Run everything and commit**

---

## Done criteria

```bash
bun test
bun run typecheck
bun run lint
bun run build
```

All four succeed. Then:

- `/map` renders a real basemap with markers drawn from fixtures.
- MapLibre and deck.gl are in the map route's chunk or a vendor chunk, not the entry chunk.
- The atlas produces the same key for entities that look the same and different keys for entities that do not, and evicts under its bound.
- Clustering keeps the rendered count under `forcedLimit` at high zoom.
- `dist/index.html` and `dist/app.html` still load different stylesheets with `@layer base` absent from the 1.0 one.
- Nothing under `src/` or `server/` changed.

## What this plan does not do

- No real data. Every entity comes from fixtures behind the source interface. Session 3 implements the transport.
- Only pokemon and gyms. Routes, S2 cells, scan areas, submission rings and interaction ranges land with their features.
- No filters. Which entities are requested is Plan 5's question, and the rules model behind it is session 2's.
- No 1.0 changes. Leaflet stays exactly where it is.
- No visual confirmation. Nothing here has been seen rendered; every claim is structural until someone opens it in a browser.
