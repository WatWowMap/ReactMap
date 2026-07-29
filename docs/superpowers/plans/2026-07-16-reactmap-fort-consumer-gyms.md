# ReactMap Fort Consumer — Gyms (match-all) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route `Gym.getAll` (markers/popups), `Gym.getOne`, and `Gym.getAvailable` through Golbat's fort endpoints when a scanner source has a Golbat `endpoint`, with SQL fallback — the first (pattern-proving, no-new-Golbat-code) slice of the ReactMap fort consumer.

**Architecture:** Each method gains a `mem` branch (source has an endpoint) that fetches from Golbat and reuses the existing `secondaryFilter`/available logic, falling through to the existing SQL on 503/error (dual source). `getAll` sends a **match-all** scan (`filters: []`) and filters in JS — DNF narrowing is a later plan. `ApiGymResult`'s field names match ReactMap's, so `getAll` needs no row mapper; only `getAvailable` gets a small aggregate mapper.

**Tech Stack:** Node, Objection/Knex, `fetchJson`, `filterRTree`, `@rm/logger`. **No test framework** (see Global Constraints).

## Global Constraints

- **No TDD / no test framework.** This repo has no test runner and the maintainer opted out of TDD (per Phase-1 #1227). Verify each task with: `npx eslint <changed files>` and `npx prettier --check <changed files>` (both clean), a **throwaway `node` golden script** for pure mappers (run with `node`, output eyeballed against hand-computed expected, then **deleted** — never committed), and explicit reasoning against the SQL path. Do **not** author committed test files.
- **Branch off `feat/pokestop-available-consumer`** (the Phase-1 ReactMap branch), NOT `develop` — this reuses Phase-1's dual-source `DbManager.getDbContext` overlay, `fetchJson`, and the `mem/secret/httpAuth` source context. (Corrects the spec's "off develop".)
- **`getAll` mem branch MUST apply `filterRTree(gym, perms.areaRestrictions, args.filters.onlyAreas)`** for area restriction — the Pokémon `getAll` template omits this (a latent gap); do not replicate the gap. `getAreaSql` is SQL-only.
- **`getAvailable` mem branch uses the `Pokestop.getAvailable` dual-source pattern:** `if (mem) { try { …; if (valid) return …; log.warn } catch { log.warn } }` then **fall through** to the existing SQL — a dual source runs SQL on its bound knex; a pure-endpoint source's `this.query()` throws and is dropped by `runScannerSources`'s `Promise.allSettled`.
- **No gym row mapper.** `ApiGymResult` JSON keys equal ReactMap's gym field names (`id,lat,lon,name,url,updated,last_modified_timestamp,team_id,available_slots,in_battle,guarding_pokemon_id,guarding_pokemon_display,defenders,total_cp,ar_scan_eligible,ex_raid_eligible,power_up_*,raid_*`), so endpoint rows feed the existing `secondaryFilter` unchanged. `guarding_pokemon_display`/`defenders` come back as JSON **strings** (Golbat types them `*string`), which `secondaryFilter`'s existing `typeof … === 'string'` `JSON.parse` already handles.
- **Client-side equivalents of SQL-only gates** (mem path only): filter rows to `enabled && !deleted` (the `onlyValid` WHERE), and when `hideOldGyms` filter rows to `updated > ts - gymValidDataLimit*86400`. `queryLimits.gyms` becomes the scan `limit` param.
- **Preserve badges unchanged.** `Badge` is a ReactMap-local table always bound to the ReactMap DB; the `userBadges`/`userBadgeObj` merge on `gym.id` runs identically on Golbat-sourced rows (they carry the same `id`).
- **`deDupeResults` keys by `id`, keeps larger `updated`** — `ApiGymResult` carries both, so dual DB+endpoint sources merge correctly.
- Endpoints: `POST {mem}/api/gym/scan` body `{min:{latitude,longitude},max:{latitude,longitude},limit,filters}`; `GET {mem}/api/gym/id/{id}`; `GET {mem}/api/gym/available`. Auth via `X-Golbat-Secret`/HTTP-Basic (handled by the shared eval util).
- Lint a single file with `npx eslint <path>`; the husky `pre-commit` runs `lint-staged` (eslint --fix + prettier) automatically on commit.

---

### Task 1: Shared `evalScannerQuery` util

**Files:**

- Create: `server/src/utils/evalScannerQuery.js`

**Interfaces:**

- Produces: `evalScannerQuery(tag, mem, query, method='POST', secret='', httpAuth=null)` — when `mem` is a URL string, POST/GET-fetches it via `fetchJson` with secret/HTTP-Basic headers and returns the parsed JSON (or a node-fetch `Response` on non-2xx, or `[]` on network error); when `mem` is falsy, awaits and returns the passed knex `query`. Consumed by Tasks 3–5.

This extracts the endpoint-or-knex evaluator that `Pokemon.evalQuery`/`Pokestop.evalQuery` duplicate, parameterized by a log tag, so the new gym (and later station) methods don't add more copies. Pokémon/Pokestop are left untouched (out of scope).

- [ ] **Step 1: Create the util** — `server/src/utils/evalScannerQuery.js`:

```js
// @ts-check
const fs = require('fs')
const { resolve } = require('path')

const config = require('@rm/config')
const { log } = require('@rm/logger')
const { fetchJson } = require('./fetchJson')

/**
 * Endpoint-or-knex query evaluator shared by Golbat-backed scanner models.
 * Mirrors Pokemon.evalQuery / Pokestop.evalQuery but is tag-parameterized so
 * new consumers (Gym, Station) don't each re-copy it.
 * @template T
 * @param {import('@rm/logger').Tag} tag
 * @param {string} mem endpoint base+path when set; falsy = evaluate `query`
 * @param {string | import('objection').QueryBuilder<any>} query JSON body (mem) or knex query
 * @param {'GET' | 'POST' | 'PATCH' | 'DELETE'} [method]
 * @param {string} [secret]
 * @param {{ username: string, password: string } | null} [httpAuth]
 * @returns {Promise<T>}
 */
async function evalScannerQuery(
  tag,
  mem,
  query,
  method = 'POST',
  secret = '',
  httpAuth = null,
) {
  if (config.getSafe('devOptions.queryDebug')) {
    const dir = resolve(__dirname, '../models/queries')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    if (mem && typeof query === 'string') {
      fs.writeFileSync(resolve(dir, `${Date.now()}.json`), query)
    } else if (typeof query === 'object' && query) {
      fs.writeFileSync(
        resolve(dir, `${Date.now()}.sql`),
        query.toKnexQuery().toString(),
      )
    }
  }
  const results = await (mem
    ? fetchJson(mem, {
        method,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(secret ? { 'X-Golbat-Secret': secret } : {}),
          ...(httpAuth
            ? {
                Authorization: `Basic ${Buffer.from(
                  `${httpAuth.username}:${httpAuth.password}`,
                ).toString('base64')}`,
              }
            : {}),
        },
        body: query,
      })
    : query)
  log.debug(tag, 'raw result length', results?.length || 0)
  return results || []
}

module.exports = { evalScannerQuery }
```

- [ ] **Step 2: Verify** — `npx eslint server/src/utils/evalScannerQuery.js && npx prettier --check server/src/utils/evalScannerQuery.js`
      Expected: clean (no output / "All matched files use Prettier code style"). Sanity-check `require('./fetchJson')` and the `@rm/logger` `Tag` type exist (they're used by `Pokemon.js`).

- [ ] **Step 3: Commit**

```bash
git add server/src/utils/evalScannerQuery.js
git commit -m "feat(scanner): shared evalScannerQuery endpoint-or-knex util"
```

---

### Task 2: `gymAvailableMapper.js` (pure aggregate mapper)

**Files:**

- Create: `server/src/models/gymAvailableMapper.js`

**Interfaces:**

- Produces: `mapGymAvailable(api)` where `api = { teams: [{team_id, available_slots, count}], raids: [{raid_level, pokemon_id, form, count}] }` → `{ available: string[] }`. Consumed by Task 3.

Reproduces `Gym.getAvailable`'s SQL key output exactly (`Gym.js:542-573`): teams → `t{team}-0` + `g{team}-{6-slots}`; raids → boss `{id}-{form}` (pokemon_id>0), egg `e{level}` (pokemon_id===0), and `r{level}` for every distinct level. Standalone/require-free like `pokestopAvailableMapper.js` so it's golden-testable under plain `node`.

- [ ] **Step 1: Create the mapper** — `server/src/models/gymAvailableMapper.js`:

```js
// @ts-check

/**
 * Pure mapper for Golbat's `GET /api/gym/available` response. Reproduces the
 * key output of the SQL `Gym.getAvailable` (t/g/e/r + boss `<id>-<form>`).
 * Dependency-free so it can run under plain node for golden checks.
 * @param {{ teams?: {team_id:number,available_slots:number,count:number}[], raids?: {raid_level:number,pokemon_id:number,form:number,count:number}[] }} api
 * @returns {{ available: string[] }}
 */
function mapGymAvailable(api) {
  const available = new Set()

  const teams = api.teams || []
  teams.forEach((t) => {
    if (t.team_id === null || t.available_slots === null) return
    available.add(`t${t.team_id}-0`)
    available.add(`g${t.team_id}-${6 - t.available_slots}`)
  })

  const raids = api.raids || []
  const raidLevels = new Set()
  raids.forEach((r) => {
    if (!r.raid_level) return
    raidLevels.add(r.raid_level)
    if (r.pokemon_id > 0) {
      available.add(`${r.pokemon_id}-${r.form}`)
    } else {
      available.add(`e${r.raid_level}`)
    }
  })
  ;[...raidLevels]
    .sort((a, b) => a - b)
    .forEach((level) => available.add(`r${level}`))

  return { available: [...available] }
}

module.exports = { mapGymAvailable }
```

- [ ] **Step 2: Golden check (throwaway `node`, then delete)** — verify against the SQL formulas. Run:

```bash
node -e '
const { mapGymAvailable } = require("./server/src/models/gymAvailableMapper");
const out = mapGymAvailable({
  teams: [{team_id:1,available_slots:2,count:5},{team_id:2,available_slots:6,count:3}],
  raids: [{raid_level:5,pokemon_id:150,form:0,count:2},{raid_level:3,pokemon_id:0,form:0,count:1}],
}).available.sort();
console.log(JSON.stringify(out));
// expected (sorted): ["150-0","e3","g1-4","g2-0","r3","r5","t1-0","t2-0"]
'
```

Expected printed: `["150-0","e3","g1-4","g2-0","r3","r5","t1-0","t2-0"]` — confirms `t{team}-0`, `g{team}-{6-slots}` (6-2=4, 6-6=0), boss `150-0`, egg `e3`, tiers `r3`/`r5`. If it matches, the mapper reproduces `Gym.js:542-573`. Do not commit this command.

- [ ] **Step 3: Verify lint** — `npx eslint server/src/models/gymAvailableMapper.js && npx prettier --check server/src/models/gymAvailableMapper.js`
      Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add server/src/models/gymAvailableMapper.js
git commit -m "feat(gym): pure mapper for /api/gym/available -> t/g/e/r keys"
```

---

### Task 3: `Gym.getAvailable` mem branch

**Files:**

- Modify: `server/src/models/Gym.js` (imports; `getAvailable` at `:514`)

**Interfaces:**

- Consumes: `evalScannerQuery` (Task 1), `mapGymAvailable` (Task 2). `getAvailable`'s source context gains `mem/secret/httpAuth` (already supplied by `DbManager` — `getDbContext` overlays them).

- [ ] **Step 1: Add imports** to `server/src/models/Gym.js` (near the other requires at the top; match existing style):

```js
const { evalScannerQuery } = require('../utils/evalScannerQuery')
const { mapGymAvailable } = require('./gymAvailableMapper')
```

(`log`, `TAGS`, `config`, `state` are already imported in `Gym.js` — confirm and don't duplicate.)

- [ ] **Step 2: Add the mem branch** at the top of `getAvailable`, changing its signature to accept the endpoint context and falling through to the existing SQL on failure. Replace the method header `static async getAvailable({ isMad, availableSlotsCol }) {` with:

```js
  static async getAvailable({ isMad, availableSlotsCol, mem, secret, httpAuth }) {
    // Endpoint source: fetch the aggregate from Golbat; on 503/error fall
    // through to the SQL below (dual source runs SQL on its bound knex; a
    // pure-endpoint source's this.query() throws and is dropped upstream).
    if (mem) {
      try {
        const res = await evalScannerQuery(
          TAGS.gyms,
          `${mem}/api/gym/available`,
          undefined,
          'GET',
          secret,
          httpAuth,
        )
        if (res && Array.isArray(res.teams) && Array.isArray(res.raids)) {
          const { available } = mapGymAvailable(res)
          log.info(
            TAGS.gyms,
            `[GYM] loaded available from Golbat endpoint ${mem}/api/gym/available — ${available.length} filter keys (${res.teams.length} team/slot, ${res.raids.length} raid options)`,
          )
          return { available }
        }
        log.warn(
          TAGS.gyms,
          '[GYM] /api/gym/available unavailable (e.g. fort_in_memory off) — returning empty available for this endpoint source',
        )
      } catch (e) {
        log.warn(
          TAGS.gyms,
          `[GYM] /api/gym/available error — returning empty available for this endpoint source: ${e}`,
        )
      }
    }
    const ts = Math.floor(Date.now() / 1000)
```

(The rest of the existing `getAvailable` body — the two `this.query()` builders and the `return { available: [...] }` — is unchanged; the new code inserts before the existing `const ts = …` line, which is kept. Confirm `TAGS.gyms` exists in `@rm/logger`; if the tag is named differently — e.g. `TAGS.gym` — use the actual key.)

- [ ] **Step 3: Verify** — `npx eslint server/src/models/Gym.js && npx prettier --check server/src/models/Gym.js`. Reasoning check: on `mem` success the endpoint keys equal the SQL keys (Task 2 golden); on `mem` unset or a non-`{teams,raids}` response, execution reaches the unchanged SQL path (dual source) — confirm there is no `return` between the `catch` and `const ts`.
      Expected: lint clean.

- [ ] **Step 4: Commit**

```bash
git add server/src/models/Gym.js
git commit -m "feat(gym): getAvailable via /api/gym/available with SQL fallback"
```

---

### Task 4: `Gym.getAll` mem branch (match-all)

**Files:**

- Modify: `server/src/models/Gym.js` (imports for `filterRTree`; `getAll` at `:114`)

**Interfaces:**

- Consumes: `evalScannerQuery` (Task 1), `filterRTree` (`server/src/utils/filterRTree.js`). `getAll`'s source context gains `mem/secret/httpAuth`.

The endpoint returns `ApiGymResult[]` whose keys match the fields `secondaryFilter` reads, so the fetched rows feed the **existing** `secondaryFilter` after client-side `onlyValid`/`hideOldGyms`/`filterRTree` filtering. Match-all sends `filters: []`.

- [ ] **Step 1: Add the `filterRTree` import** (if not already present) near the top of `Gym.js`:

```js
const { filterRTree } = require('../utils/filterRTree')
```

- [ ] **Step 2: Accept the endpoint context** — change the `getAll` signature to destructure the endpoint fields and `areaRestrictions` (already in `perms`). Replace `static async getAll(perms, args, { isMad, availableSlotsCol }, userId) {` with:

```js
  static async getAll(perms, args, { isMad, availableSlotsCol, mem, secret, httpAuth }, userId) {
```

- [ ] **Step 3: Insert the mem branch** immediately **before** the SQL query-building block. The insertion point is right after `finalSlots`/`finalTeams`/`userBadges` are computed and the "returns nothing if…" guards, and before `if (onlyAllGyms && onlyLevels !== 'all' …)` (around `Gym.js:262`) — i.e. after everything `secondaryFilter` closes over is set up. `secondaryFilter` is defined later in the method; JS hoists the `const secondaryFilter` only at its definition, so this branch must call it **after** its definition. To keep that ordering simple, place the branch as the **last** thing before `return secondaryFilter(await query.limit(queryLimits.gyms))` — i.e. replace that final return with:

```js
if (mem) {
  try {
    const rows = await evalScannerQuery(
      TAGS.gyms,
      `${mem}/api/gym/scan`,
      JSON.stringify({
        min: { latitude: args.minLat, longitude: args.minLon },
        max: { latitude: args.maxLat, longitude: args.maxLon },
        limit: queryLimits.gyms,
        filters: [],
      }),
      'POST',
      secret,
      httpAuth,
    )
    if (Array.isArray(rows)) {
      const active = rows.filter(
        (gym) =>
          gym.enabled &&
          !gym.deleted &&
          (!hideOldGyms || gym.updated > ts - gymValidDataLimit * 86400) &&
          filterRTree(gym, areaRestrictions, onlyAreas),
      )
      return secondaryFilter(active)
    }
    log.warn(
      TAGS.gyms,
      '[GYM] /api/gym/scan unavailable (e.g. fort_in_memory off) — falling back to SQL for this source',
    )
  } catch (e) {
    log.warn(
      TAGS.gyms,
      `[GYM] /api/gym/scan error — falling back to SQL for this source: ${e}`,
    )
  }
}
return secondaryFilter(await query.limit(queryLimits.gyms))
```

Notes: `hideOldGyms`, `gymValidDataLimit`, `queryLimits` are already destructured from `config.getSafe('api')` at the method top; `areaRestrictions` is from `perms`, `onlyAreas` from `args.filters`, `ts` is already computed. On endpoint failure the `try` falls through to the unchanged `return secondaryFilter(await query.limit(queryLimits.gyms))` (dual source runs the SQL query that was still built above; a pure-endpoint source's `this.query()` chain has no knex and its `getAll` promise is dropped by `runScannerSources`). The SQL query-building block above the branch is unchanged — it still runs on the fall-through path.

- [ ] **Step 4: Verify** — `npx eslint server/src/models/Gym.js && npx prettier --check server/src/models/Gym.js`. Reasoning check against the SQL path:

  - Match-all `filters: []` → Golbat `/api/gym/scan` returns every gym in the bbox; `secondaryFilter` then applies the same `hasRaid`/`hasGym`/badge membership it applies to SQL rows, so the returned set matches the SQL WHERE-narrowed set.
  - `onlyValid` (`enabled && !deleted`), `hideOldGyms`, and area (`filterRTree`) are applied client-side because the endpoint has no SQL WHERE / `getAreaSql`.
  - `ApiGymResult` supplies every `coreFields`/`gymFields`/`raidFields` key by the same name; `guarding_pokemon_display`/`defenders` arrive as JSON strings and are parsed by the existing `typeof … === 'string'` branch.
  - Badges: `userBadges` was computed above and `secondaryFilter` merges on `gym.id` — unchanged.

  Optional endpoint smoke (needs a Golbat deploy of #385's branch, so document as manual): with a dual gym source configured, load the map and confirm gym/raid markers render and popups show team/raid detail, matching the DB path.
  Expected: lint clean.

- [ ] **Step 5: Commit**

```bash
git add server/src/models/Gym.js
git commit -m "feat(gym): getAll via /api/gym/scan (match-all) with filterRTree + SQL fallback"
```

---

### Task 5: `Gym.getOne` mem branch

**Files:**

- Modify: `server/src/models/Gym.js` (`getOne` at `:698`)

**Interfaces:**

- Consumes: `evalScannerQuery` (Task 1). `getOne`'s source context gains `mem/secret/httpAuth`.

`getOne` is used by `gymsSingle` for recenter/deep-link; the client fragment reads only `lat`/`lon`. The by-id endpoint returns a full `ApiGymResult`; returning it whole is a harmless superset.

- [ ] **Step 1: Add the mem branch** — replace `getOne` (`Gym.js:698-706`) with:

```js
  static async getOne(id, { isMad, mem, secret, httpAuth }) {
    if (mem) {
      try {
        const res = await evalScannerQuery(
          TAGS.gyms,
          `${mem}/api/gym/id/${id}`,
          undefined,
          'GET',
          secret,
          httpAuth,
        )
        if (res && typeof res === 'object' && 'lat' in res && 'lon' in res) {
          return res
        }
      } catch (e) {
        log.warn(TAGS.gyms, `[GYM] /api/gym/id error — falling back to SQL: ${e}`)
      }
    }
    return this.query()
      .select([
        isMad ? 'latitude AS lat' : 'lat',
        isMad ? 'longitude AS lon' : 'lon',
      ])
      .where(isMad ? 'gym_id' : 'id', id)
      .first()
  }
```

Note: `DbManager.getOne(model, id)` calls `SubModel.getOne(id, source)` with the source context, and a 404 from the by-id endpoint returns a non-`{lat,lon}` shape → falls through to SQL (a dual source's knex answers; a pure-endpoint source returns undefined and is dropped by the caller's `.filter(Boolean)`).

- [ ] **Step 2: Verify** — `npx eslint server/src/models/Gym.js && npx prettier --check server/src/models/Gym.js`. Reasoning: `mem` set + 2xx with lat/lon → endpoint record; 404/error/`mem` unset → SQL lat/lon. Return shape carries `lat`/`lon` in all cases, satisfying `GET_ONE_GYM`.
      Expected: lint clean.

- [ ] **Step 3: Commit**

```bash
git add server/src/models/Gym.js
git commit -m "feat(gym): getOne via /api/gym/id/{id} with SQL fallback"
```

---

## Self-Review

**Spec coverage** (design spec §8-§9/§11, gyms slice): `Gym.getAll` mem branch (match-all) → Task 4; `Gym.getOne` → Task 5; `Gym.getAvailable` → Task 3 (+ mapper Task 2); shared plumbing (`evalScannerQuery`) → Task 1; `filterRTree` area handling → Task 4; dual-source fallback → Tasks 3-5. DNF (`Backend`), stations, and pokestops are **out of this slice** (later plans on the same branch). No gap for gyms-match-all.

**Placeholder scan:** every code step has complete code; the only manual verification (Task 4 endpoint smoke) is explicitly documented as needing a Golbat deploy, not a faked test — consistent with the no-test-framework constraint.

**Type/name consistency:** `evalScannerQuery(tag, mem, query, method, secret, httpAuth)` is defined in Task 1 and called identically in Tasks 3-5; `mapGymAvailable(api) → {available}` defined in Task 2, consumed in Task 3; `TAGS.gyms` used consistently (the implementer must confirm the exact tag key in `@rm/logger` — it may be `TAGS.gym`; use whatever exists, consistently). `ApiGymResult` field names feed `secondaryFilter` unchanged (no mapper), per the field-mapping research.

**Open items for the implementer to confirm (not gaps, but verify):**

1. The exact `@rm/logger` tag key for gyms (`TAGS.gyms` vs `TAGS.gym`) — grep `@rm/logger`'s tags.
2. That `config.getSafe('api')` in `getAll` already yields `hideOldGyms`/`gymValidDataLimit`/`queryLimits` (it does per the research) — no new config read needed.
3. That `secondaryFilter` is defined before the final `return` where the mem branch is inserted (it is — the branch replaces the existing final return).

## Follow-on plans (same branch/PR, not this slice)

- **Stations (match-all):** `Station.getAll`/`getOne`/`getAvailable` — same pattern; needs a `stationAvailableMapper` (`{battles:[…]}` → `j{level}`/`<id>-<form>` keys) and a **station row mapper** (Golbat `ApiStationResult` uses pointer/nullable fields and a `battles[]` array — unlike gyms, its field shape may need light mapping; confirm during that plan).
- **Pokestops (match-all):** `Pokestop.getAll`/`getOne` — needs `with_incidents: true` in the scan body and a pokestop row mapper (quest/lure/invasion/showcase sub-objects); depends on the Golbat PR #385 being deployed.
- **DNF (all three):** a fort filter `Backend.buildApiFilter()` mirroring `PkmnBackend`, replacing `filters: []` with translated `ApiFortDnfFilter[]` — the payoff phase.
- **Shared-util cleanup:** migrate `Pokemon`/`Pokestop` `evalQuery` onto `evalScannerQuery` (deferred; avoids touching shipped code now).
