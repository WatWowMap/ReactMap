# ReactMap Fort Consumer — Stations (match-all) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route `Station.getAll` (Power Spot / Max-battle markers & popups) and `Station.getAvailable` (filter list) through Golbat's fort endpoints, with SQL fallback — the stations slice of the ReactMap fort consumer, mirroring the merged gyms slice.

**Architecture:** Each method gains a `mem` branch (source has a Golbat `endpoint`) that fetches from Golbat and falls through to the existing SQL on 503/error (dual source). `getAll` sends a **match-all** scan (`filters:[]`), reads `res.stations` off the envelope, maps each `ApiStationResult` into ReactMap's station shape, and reuses `Station.js`'s existing pure post-processing helpers (`enrichStationBattle`/`finalizeStation`/`setStationBattleFields`/`matchesStationBattleFilter`/…) plus `filterRTree` for area restriction. `getAvailable` uses a small `stationAvailableMapper`. DNF narrowing is a later plan.

**Tech Stack:** Node, Objection/Knex, `evalScannerQuery`, `filterRTree`, `@rm/logger`, ohbem (via `getSharedPvpWrapper`). **No test framework** (see Global Constraints).

## Global Constraints

- **No TDD / no test framework.** Verify each task with `npx eslint <files>` + `npx prettier --check <files>` (clean), a throwaway `node` golden script for the pure mapper (deleted, not committed), and reasoning against the SQL path. Do **not** author committed test files.
- **Branch:** `feat/fort-consumer` (the branch already holding the gyms slice). Reuses `server/src/utils/evalScannerQuery.js` (`evalScannerQuery`, `describeScannerResponse`) and `server/src/utils/filterRTree.js` from the gyms slice.
- **Scan endpoints return an envelope, not a bare array.** `POST /api/station/scan` → `{ stations:[], examined, skipped, total }` — read `res.stations` (per spec §9). `GET /api/station/available` → `{ battles:[{ battle_level, pokemon_id, form, count }] }`. `GET /api/station/id/{id}` → a bare `ApiStationResult`.
- **`getAll` MUST apply `filterRTree(station, perms.areaRestrictions, args.filters.onlyAreas)`** — `getAreaSql` is SQL-only; the endpoint can't know ReactMap's area polygons.
- **Reuse `Station.js`'s existing pure helpers** (`enrichStationBattle`, `estimateStationCp`, `getVisibleStationBattle`, `setStationBattleFields`, `clearStationBattleFallback`, `finalizeStation`, `matchesStationBattleFilter`, `isStationBattleActive`) — do NOT reimplement battle/CP/finalize logic. The endpoint path maps each `ApiStationResult` to `{ ...apiStation, battles: apiStation.battles.map(enrich) }` and runs the same post-processing the SQL multi-battle tail does.
- **Row mapper needed (unlike gyms):** `ApiStationResult` top level has no `battle_pokemon_stamina`/`battle_pokemon_cp_multiplier`/`battle_pokemon_estimated_cp` — those live inside `battles[]` (stamina/cp_multiplier) or are computed (estimated_cp). CP estimation needs ohbem `pokemonData` (`getSharedPvpWrapper().ensurePokemonData()`), same as the SQL path.
- **`stationed_pokemon` JSON blob is NOT needed for `getAll`** — Golbat supplies `total_stationed_gmax` pre-aggregated, so `finalizeStation`'s `JSON.parse(stationed_pokemon)` fallback never triggers for endpoint rows.
- **`getOne` is out of scope** — it's dead code (no `stationsSingle` resolver/typeDef exists; nothing calls `Db.getOne('Station', …)`). `getDynamaxMons`/`stationPokemon` also stay on SQL (separate concern; needs the `stationed_pokemon` blob).
- **`getAvailable`/`getAll` currently drop `mem/secret/httpAuth`** from their destructured ctx — add them.
- **`deDupeResults` keys by `id`, larger `updated`** — `ApiStationResult` carries both; dual DB+endpoint sources merge correctly.
- **Acceptance gate for `getAll` (mandatory):** because the station filter logic is intricate and there is no test suite, the getAll task is not "done" until a **live golden comparison** passes — station markers/popups from the endpoint match the SQL path on the same bbox (counts, active/inactive, battle detail, gmax, CP), against a Golbat deploy of #385. Document the result.
- Commitlint: lowercase commit subjects.

---

### Task 1: `stations` logger tag

**Files:**

- Modify: `packages/logger/lib/tags.js`

**Interfaces:**

- Produces: `TAGS.stations` (renders `[STATIONS]`), consumed by Tasks 2–3.

- [ ] **Step 1: Add the tag** — in `packages/logger/lib/tags.js`, next to `gyms:` (which is `gyms: chalk.hex('#9c27b0')('[GYMS]')`), add:

```js
  stations: chalk.hex('#00bcd4')('[STATIONS]'),
```

- [ ] **Step 2: Verify** — `npx eslint packages/logger/lib/tags.js && npx prettier --check packages/logger/lib/tags.js`
      Expected: clean. Confirm `TAGS.stations` resolves (grep the file).

- [ ] **Step 3: Commit**

```bash
git add packages/logger/lib/tags.js
git commit -m "feat(logger): add stations tag"
```

---

### Task 2: `stationAvailableMapper.js` + `Station.getAvailable` mem branch

**Files:**

- Create: `server/src/models/stationAvailableMapper.js`
- Modify: `server/src/models/Station.js` (imports; `getAvailable` at `:982`)

**Interfaces:**

- Produces: `mapStationAvailable(api)` where `api = { battles:[{ battle_level, pokemon_id, form, count }] }` → `{ available: string[] }`. `getAvailable`'s ctx gains `mem/secret/httpAuth`.

Reproduces the SQL `Station.getAvailable` key output: `j{battle_level}` + `{battle_pokemon_id}-{battle_pokemon_form}`. Note `/api/station/available` uses `pokemon_id`/`form` (not `battle_pokemon_id`/`battle_pokemon_form`).

- [ ] **Step 1: Create the mapper** — `server/src/models/stationAvailableMapper.js`:

```js
// @ts-check

/**
 * Pure mapper for Golbat's `GET /api/station/available` response. Reproduces the
 * key output of the SQL `Station.getAvailable`: `j{level}` battle-tier keys and
 * `<pokemon_id>-<form>` battle-pokemon keys. Dependency-free (golden-testable
 * under plain node).
 * @param {{ battles?: {battle_level:number, pokemon_id:number, form:number, count:number}[] }} api
 * @returns {{ available: string[] }}
 */
function mapStationAvailable(api) {
  const available = new Set()
  const battles = api.battles || []
  battles.forEach((b) => {
    if (!b.battle_level) return
    available.add(`${b.pokemon_id}-${b.form}`)
    available.add(`j${b.battle_level}`)
  })
  return { available: [...available] }
}

module.exports = { mapStationAvailable }
```

- [ ] **Step 2: Golden check (throwaway `node`, delete after)** — Run:

```bash
node -e '
const { mapStationAvailable } = require("./server/src/models/stationAvailableMapper");
const out = mapStationAvailable({ battles: [
  { battle_level: 3, pokemon_id: 150, form: 0, count: 2 },
  { battle_level: 5, pokemon_id: 384, form: 0, count: 1 },
  { battle_level: 0, pokemon_id: 1, form: 0, count: 9 },   // level 0 -> skipped
] }).available.sort();
console.log(JSON.stringify(out));  // expect ["150-0","384-0","j3","j5"]
'
```

Expected printed: `["150-0","384-0","j3","j5"]` (level-0 excluded, matching SQL `!!battle_level`).

- [ ] **Step 3: Add the mem branch** — in `server/src/models/Station.js`, add imports near the top (match existing style; `evalScannerQuery`/`describeScannerResponse` are the gyms-slice util; `log`/`TAGS` — confirm they're imported, Station.js already uses `log`/`TAGS.fetch`):

```js
const {
  evalScannerQuery,
  describeScannerResponse,
} = require('../utils/evalScannerQuery')
const { mapStationAvailable } = require('./stationAvailableMapper')
```

Change the `getAvailable` signature and prepend the mem branch. Replace `static async getAvailable({ hasMultiBattles }) {` with:

```js
  static async getAvailable({ hasMultiBattles, mem, secret, httpAuth }) {
    // Endpoint source: fetch the aggregate from Golbat; on 503/error fall
    // through to the SQL below (dual source runs SQL on its bound knex; a
    // pure-endpoint source's this.query() throws and is dropped upstream).
    if (mem) {
      try {
        const res = await evalScannerQuery(
          TAGS.stations,
          `${mem}/api/station/available`,
          undefined,
          'GET',
          secret,
          httpAuth,
        )
        if (res && Array.isArray(res.battles)) {
          const { available } = mapStationAvailable(res)
          log.info(
            TAGS.stations,
            `[STATION] loaded available from Golbat endpoint ${mem}/api/station/available — ${available.length} filter keys (${res.battles.length} battle options)`,
          )
          return { available }
        }
        log.warn(
          TAGS.stations,
          `[STATION] /api/station/available gave no battles — ${describeScannerResponse(res)} — returning empty available for this endpoint source`,
        )
      } catch (e) {
        log.warn(
          TAGS.stations,
          `[STATION] /api/station/available error — returning empty available for this endpoint source: ${e}`,
        )
      }
    }
    /** @type {import('@rm/types').FullStation[]} */
    const ts = getEpoch()
```

(The rest of `getAvailable` — the two `this.query()` builders + the `return { available: [...] }` — is unchanged; the new code inserts before the existing `const ts = getEpoch()` line, which is kept. Confirm there is no `return` between the `catch` and `const ts`.)

- [ ] **Step 4: Verify** — `npx eslint server/src/models/Station.js server/src/models/stationAvailableMapper.js && npx prettier --check server/src/models/Station.js server/src/models/stationAvailableMapper.js`. Reasoning: on `mem` success the endpoint keys equal the SQL keys (Step 2 golden); on `mem` unset / non-`{battles}` response, execution reaches the unchanged SQL path (dual source).

- [ ] **Step 5: Commit**

```bash
git add server/src/models/stationAvailableMapper.js server/src/models/Station.js
git commit -m "feat(station): getAvailable via /api/station/available with SQL fallback"
```

---

### Task 3: `Station.getAll` mem branch (match-all)

**Files:**

- Modify: `server/src/models/Station.js` (`filterRTree` import; `getAll` at `:581`)

**Interfaces:**

- Consumes: `evalScannerQuery`/`describeScannerResponse` (Task 2 imports), `filterRTree`, and the existing pure helpers `enrichStationBattle`/`getVisibleStationBattle`/`setStationBattleFields`/`clearStationBattleFallback`/`finalizeStation`/`matchesStationBattleFilter` (all already in `Station.js`). `getSharedPvpWrapper` (already imported for CP). `getAll`'s ctx gains `mem/secret/httpAuth`.

The endpoint returns each station with `battles[]` embedded, so no `station_battle` grouping is needed — map, enrich battles with CP, then run the SAME per-station post-processing the SQL multi-battle tail does, with the SQL WHERE replicated as JS pre-filters.

- [ ] **Step 1: Add the `filterRTree` import** (near the top of `Station.js`, if not present):

```js
const { filterRTree } = require('../utils/filterRTree')
```

- [ ] **Step 2: Accept the endpoint context** — change the `getAll` signature. Replace `{ isMad, hasMultiBattles, hasStationedGmax, hasBattlePokemonStats }` with `{ isMad, hasMultiBattles, hasStationedGmax, hasBattlePokemonStats, mem, secret, httpAuth }`.

- [ ] **Step 3: Insert the mem branch** immediately after the option/filter setup and BEFORE the SQL `select`/query building — specifically after `const shouldRestrictReturnedBattles = onlyMaxBattles && hasBattleConditions` and before `if (includeBattleData) {`. (`ts`, `activeCutoff`, `inactiveCutoff`, `battleFilterOptions`, `includeUpcoming`, `includeBattleData`, `shouldRestrictReturnedBattles`, `onlyAllStations`, `onlyInactiveStations`, `onlyMaxBattles`, `onlyGmaxStationed`, `hasBattleConditions`, `areaRestrictions`, `onlyAreas` are all in scope by then; `queryLimits` — confirm `queryLimits.stations` exists in `config.getSafe('api').queryLimits`; if not, use `queryLimits.gyms` as the cap or omit `limit`.)

```js
if (mem) {
  try {
    // /api/station/scan returns an envelope { stations, examined, skipped,
    // total } — the matching stations are on res.stations.
    const res = await evalScannerQuery(
      TAGS.stations,
      `${mem}/api/station/scan`,
      JSON.stringify({
        min: { latitude: args.minLat, longitude: args.minLon },
        max: { latitude: args.maxLat, longitude: args.maxLon },
        limit: queryLimits.stations,
        filters: [],
      }),
      'POST',
      secret,
      httpAuth,
    )
    if (res && Array.isArray(res.stations)) {
      // CP estimation needs ohbem base stats, same as the SQL path.
      let pokemonData = null
      if (perms.dynamax && includeBattleData) {
        try {
          pokemonData = await getSharedPvpWrapper().ensurePokemonData()
        } catch (e) {
          log.warn(
            TAGS.fetch,
            'Unable to load ohbem basics for station CP estimation',
            e,
          )
        }
      }
      // Replicate the SQL WHERE that the endpoint (match-all) can't apply.
      const passesFilterGate = (s) => {
        if (onlyAllStations) return true
        if (!perms.dynamax) return false
        const battleMatch =
          onlyMaxBattles &&
          hasBattleConditions &&
          (s.battles || []).some((b) =>
            matchesStationBattleFilter(b, battleFilterOptions),
          )
        const gmaxMatch =
          onlyGmaxStationed && Number(s.total_stationed_gmax || 0) > 0
        return battleMatch || gmaxMatch
      }
      const passesTimeGate = (s) => {
        const active =
          Number(s.end_time) > ts && Number(s.updated) > activeCutoff
        if (onlyInactiveStations) {
          const inactive =
            Number(s.end_time) <= ts && Number(s.updated) > inactiveCutoff
          return (active && passesFilterGate(s)) || inactive
        }
        return active && passesFilterGate(s)
      }
      const stations = res.stations
        .filter(
          (s) =>
            passesTimeGate(s) && filterRTree(s, areaRestrictions, onlyAreas),
        )
        .map((apiStation) => {
          const station = {
            ...apiStation,
            battles: includeBattleData
              ? (apiStation.battles || []).map((b) =>
                  enrichStationBattle(b, pokemonData),
                )
              : [],
          }
          // Mirror the SQL multi-battle tail (Station.js grouped-values map):
          if (Number(station.end_time) <= ts) {
            station.battles = []
            clearStationBattleFallback(station)
            return finalizeStation(station, pokemonData, ts)
          }
          if (!includeUpcoming) {
            const visible = getVisibleStationBattle(station.battles, ts)
            station.battles = visible ? [visible] : []
          }
          const hasMatchingReturnedBattle = station.battles.some((b) =>
            matchesStationBattleFilter(b, battleFilterOptions),
          )
          if (
            !onlyAllStations &&
            shouldRestrictReturnedBattles &&
            !hasMatchingReturnedBattle &&
            !onlyGmaxStationed
          ) {
            return null
          }
          setStationBattleFields(
            station,
            getVisibleStationBattle(station.battles, ts),
          )
          return finalizeStation(station, pokemonData, ts)
        })
        .filter(Boolean)
      return stations
    }
    log.warn(
      TAGS.stations,
      `[STATION] /api/station/scan gave no stations array — ${describeScannerResponse(res)} — falling back to SQL for this source`,
    )
  } catch (e) {
    log.warn(
      TAGS.stations,
      `[STATION] /api/station/scan error — falling back to SQL for this source: ${e}`,
    )
  }
}
```

On endpoint failure the `try` falls through to the unchanged SQL query building + await + post-processing below (dual source runs it; a pure-endpoint source's `this.query()` chain has no knex and its promise is dropped by `runScannerSources`).

- [ ] **Step 4: Verify — lint + reasoning** — `npx eslint server/src/models/Station.js && npx prettier --check server/src/models/Station.js`. Reasoning against the SQL path, field by field:

  - Time gate = SQL `end_time > ts && updated > activeCutoff` (default) / the two-branch active-OR-inactive when `onlyInactiveStations`.
  - `passesFilterGate` = SQL `applyStationFilters`: `onlyAllStations` → all; else `(onlyMaxBattles && hasBattleConditions && battle-match) || (onlyGmaxStationed && gmax>0)`.
  - The `.map(...)` mirrors the SQL multi-battle tail verbatim (same `end_time<=ts` clear, `!includeUpcoming` visible-battle narrowing, `shouldRestrictReturnedBattles` drop, `setStationBattleFields` + `finalizeStation`).
  - CP: `battles[]` carries `battle_pokemon_stamina`/`battle_pokemon_cp_multiplier`; `enrichStationBattle` computes `battle_pokemon_estimated_cp` per battle; `setStationBattleFields` mirrors the visible battle (incl. stamina/cp_multiplier/estimated_cp) to top level — matching SQL.
  - Area via `filterRTree`; `deDupeResults` sees `id`+`updated`.
    Expected: lint clean.

- [ ] **Step 5: Acceptance gate — LIVE golden comparison (mandatory).** Against a Golbat deploy of `feat/fort-scan-map-data` (#385) with `fort_in_memory = true` and a dual station source configured, in a scanned area with active Power Spots/Max battles:

  1. Endpoint on: load the map, capture the rendered stations (count + a few popups' battle detail/CP/gmax).
  2. Restart Golbat with `fort_in_memory = false` (ReactMap falls back to SQL): reload, capture the same.
  3. Confirm they match — station count, active vs inactive, per-battle pokemon/level/CP, `total_stationed_gmax`, `is_battle_available`. Also exercise the filters: `onlyMaxBattles` on a specific tier (`j5`) and a specific battle pokemon, `onlyGmaxStationed`, and `onlyInactiveStations`.
     Record the comparison result in the task report. Any divergence is a defect to fix before marking Task 3 complete. (Rationale: the JS filter replication is the highest-risk part and the repo has no test suite.)

- [ ] **Step 6: Commit**

```bash
git add server/src/models/Station.js
git commit -m "feat(station): getAll via /api/station/scan (match-all) with filterRTree + SQL fallback"
```

---

## Self-Review

**Spec coverage** (design spec §8-§9/§11, stations slice): `Station.getAvailable` → Task 2 (+ mapper); `Station.getAll` (match-all) → Task 3; envelope `res.stations` (§9 table) → Task 3; `filterRTree` area (D7) → Task 3; dual-source fallback → Tasks 2–3; `res.battles → j/<id>-<form>` → Task 2 mapper. `getOne` (dead code) + `getDynamaxMons` (needs the JSON blob) explicitly out of scope. DNF is a later plan.

**Placeholder scan:** every code step has complete code; the only manual verification (Task 3 Step 5) is an explicitly-required live golden comparison, not a faked test — correct for the no-test-framework constraint, and load-bearing given the filter-replication risk.

**Type/name consistency:** `mapStationAvailable(api) → {available}` (Task 2) is standalone; `TAGS.stations` (Task 1) used in Tasks 2–3; the pure helpers (`enrichStationBattle`/`finalizeStation`/`setStationBattleFields`/`matchesStationBattleFilter`/`getVisibleStationBattle`/`clearStationBattleFallback`) and `getSharedPvpWrapper` are existing `Station.js` module functions — the endpoint branch calls them by their existing names.

**Open items for the implementer to confirm (verify, not gaps):**

1. `TAGS.stations` vs `TAGS.station` — use the key added in Task 1, consistently.
2. `queryLimits.stations` exists in `config.getSafe('api').queryLimits`; if not, fall back to `queryLimits.gyms` or omit `limit`.
3. The mem-branch insertion point in `getAll` sees all the referenced locals in scope (they're computed above `if (includeBattleData) {`).
4. `log`/`TAGS` are already imported in `Station.js` (it uses `TAGS.fetch`); do not duplicate.

## Follow-on plans (same branch/PR)

- **Pokestops (match-all):** `Pokestop.getAll`/`getOne` — needs `with_incidents:true` in the scan body + a pokestop row mapper (quest/lure/invasion/showcase sub-objects); reads `res.pokestops`.
- **DNF (all three):** a fort filter `Backend.buildApiFilter()` mirroring `PkmnBackend` — replaces `filters:[]` with translated `ApiFortDnfFilter[]` (the payoff phase).
- **Station `getDynamaxMons`/`stationPokemon` + `getOne`:** deferred — needs the `stationed_pokemon` blob and (for getOne) a `stationsSingle` resolver that doesn't exist yet.
