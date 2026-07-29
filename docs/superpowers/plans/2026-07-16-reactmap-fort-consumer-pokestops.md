# ReactMap Fort Consumer — Pokestops (match-all) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route `Pokestop.getAll` (map markers/popups) and `Pokestop.getOne` through Golbat's `POST /api/pokestop/scan` (`with_incidents:true`) and `GET /api/pokestop/id/{id}` when a source is endpoint-backed, falling back to SQL otherwise — completing the fort-consumer trio (gyms + stations already shipped; `getAvailable` shipped in Phase-1 #1227).

**Architecture:** A pure row mapper (`pokestopScanMapper.js`) turns one Golbat `ApiPokestopResult` (+ its `invasions[]`) into the exact per-stop object shape `Pokestop.mapRDM` emits from joined SQL rows. `Pokestop.getAll`'s new `mem` branch fetches the scan, maps each stop, applies `filterRTree` area restriction, then runs the **existing, unchanged** `Pokestop.secondaryFilter` — identical to how `Gym.getAll` reuses its `secondaryFilter`. The only genuinely new logic is reading `quest_reward_type`, which Golbat has no flat column for, from the native `quest_rewards[0].type` array Golbat returns (commit `1c86576`) — no `JSON.parse`.

**Tech Stack:** Node.js, Objection/Knex, `@rm/logger`, existing `evalScannerQuery`/`describeScannerResponse`/`filterRTree` utils. Golbat scan endpoints from spec `docs/superpowers/specs/2026-07-16-fort-scan-map-data-design.md`.

## Global Constraints

- **Branch:** work on `feat/fort-consumer` (already checked out). Diffs/reviews are against the branch HEAD before each task.
- **No test runner in this repo** (maintainer opted out of TDD). Verify each change with `npx eslint <file>` and `npx prettier --check <file>`, plus a **throwaway `node` golden script** (run it, confirm output, then delete it — never `git add` it) and explicit reasoning. Do NOT add a test framework, and do NOT commit any test/spec file.
- **Commit subjects lowercase** (commitlint rejects start-case): `feat(pokestop): ...`.
- **Push to the `fork` remote** (`jfberry/ReactMap`); PR #1228 targets `WatWowMap:develop`. Do not push to `origin`/upstream.
- **Envelope shape:** `/api/pokestop/scan` returns `{ pokestops, examined, skipped, total }` — read `res.pokestops`, never `Array.isArray(res)`. `/api/pokestop/id/{id}` returns a **bare** `ApiPokestopResult`.
- **Reuse `secondaryFilter` verbatim** (as gyms reused `secondaryFilter`). The mapper's job is to produce `mapRDM`-shaped rows; all filtering, reward expansion, `key` building, midnight/layer gating, incident-blocker and `events[]` assembly stay inside the unchanged `secondaryFilter`. The ONE allowed edit to shared code is a single-line tolerance in `parseRdmRewards` so it accepts `quest_rewards` as either a native object (endpoint path) or a legacy JSON string (SQL path) — mirroring the `typeof … === 'string' ? JSON.parse : …` pattern `secondaryFilter` already uses for `showcase_rankings`. The SQL/MAD path always hits the string branch, so its behavior is unchanged.
- **Do NOT touch `getAvailable`** — it shipped in Phase-1 (#1227) and uses the older `this.evalQuery` helper. Leave it alone.
- **Scan body must include `with_incidents: true`** so Golbat attaches the `invasions[]` (grunts + showcase/goldstop/kecleon event rows).
- **Golbat facts verified against #385 source** (`decoder/api_pokestop.go`, `decoder/api_fort.go`): `ApiPokestopResult` has NO flat `quest_reward_type`; `quest_rewards`/`alternative_quest_rewards` are **native JSON** (arrays of `{type, info}`, or `null`) as of Golbat commit `1c86576` — read `quest_rewards[0].type`, do NOT `JSON.parse`; `quest_conditions`/`showcase_rankings` remain serialized JSON strings (opaque passthrough, the mapper never decodes them); each `invasions[]` entry has json fields `character` (0 for non-rocket), `expiration`, `display_type` (7 goldstop / 8 kecleon / 9 showcase), `confirmed`, `slot_1_pokemon_id`/`slot_1_form`/`slot_2_*`/`slot_3_*`; `CollectPokestopIncidents` returns ALL active incidents pruned to `expiration > now`.
- **`quest_rewards` is a dead wire field** — verified no client GraphQL fragment selects it (only `scanner.graphql:74` declares `quest_rewards: String`; it feeds server-side `parseRdmRewards` and is never sent to the client). So passing it through `secondaryFilter` as a native object is safe (GraphQL only serializes selected fields).

---

## File Structure

- **Create `server/src/models/pokestopScanMapper.js`** — pure, dependency-free module exporting `mapScanPokestop(api)` (→ mapRDM-shaped row or `null`), plus `buildQuestLayer` and `mapInvasion` helpers. Standalone so it runs under plain `node` for golden checks.
- **Modify `server/src/models/Pokestop.js`**:
  - Add imports: `evalScannerQuery`, `describeScannerResponse`, `filterRTree`, `mapScanPokestop`.
  - `getAll` — add `mem, secret, httpAuth` to the ctx destructure; insert a `mem` branch just before `const results = await query`.
  - `getOne` — add `mem, secret, httpAuth` to the ctx destructure; insert a `mem` branch mirroring `Gym.getOne`.

---

### Task 1: `pokestopScanMapper.js` — pure Golbat-row → mapRDM-shape mapper

**Files:**

- Create: `server/src/models/pokestopScanMapper.js`
- Verify: throwaway `node` golden (create in repo root, run, delete)

**Interfaces:**

- Consumes: one Golbat `ApiPokestopResult` object (see Global Constraints for its json fields) with an optional `invasions[]` array.
- Produces:

  - `mapScanPokestop(api) → object | null` — a per-stop row with keys `{ id, lat, lon, enabled, url, name, last_modified_timestamp, updated, ar_scan_eligible, power_up_points, power_up_level, power_up_end_timestamp, lure_id, lure_expire_timestamp, showcase_expiry, showcase_pokemon_id, showcase_pokemon_form_id, showcase_pokemon_type_id, showcase_ranking_standard, showcase_rankings, quests, invasions }`. Returns `null` when `!api.enabled || api.deleted`.
  - `buildQuestLayer(api, prefix, withAr) → object | null` — one quest object `{ quest_type, quest_timestamp, quest_target, quest_conditions, quest_rewards, quest_reward_type, quest_title, with_ar }` or `null` when the layer has no active/parseable quest.
  - `mapInvasion(inc) → object` — one invasion object with keys `{ incident_expire_timestamp, grunt_type, display_type, confirmed, slot_1_pokemon_id, slot_1_form, slot_2_pokemon_id, slot_2_form, slot_3_pokemon_id, slot_3_form }`.
  - Task 2's `Pokestop.getAll` `mem` branch consumes `mapScanPokestop`; the mapped rows are fed to `secondaryFilter`, which computes `newQuest.key` and calls `parseRdmRewards` itself — the mapper must NOT compute `key` or expand rewards.

- [ ] **Step 1: Write the mapper**

Create `server/src/models/pokestopScanMapper.js`:

```js
// @ts-check

/**
 * Pure mapper for one pokestop from Golbat's `POST /api/pokestop/scan`
 * (envelope `res.pokestops[]`) or `GET /api/pokestop/id/{id}` (bare object).
 *
 * Produces the SAME per-stop shape `Pokestop.mapRDM` emits from joined SQL
 * rows, so `Pokestop.secondaryFilter` (and the `parseRdmRewards` it calls) run
 * downstream completely unchanged — exactly how `Gym.getAll` reuses its own
 * `secondaryFilter`. All filtering, reward expansion, `key` building, midnight/
 * layer gating, incident-blocker and `events[]` assembly stay in secondaryFilter.
 *
 * The one piece of real work: Golbat's ApiPokestopResult has no flat
 * `quest_reward_type` column (RDM's DB does), so we read it from the native
 * `quest_rewards[0].type` array Golbat returns (commit `1c86576` made
 * `quest_rewards`/`alternative_quest_rewards` native JSON via `jsonRaw()`, not
 * escaped strings) — no `JSON.parse`. This matches how RDM's own quest_rewards
 * JSON encodes it (`Pokestop.parseRdmRewards` reads `rewards[0].type`).
 *
 * Standalone by design (no requires) so it runs under plain `node` for golden
 * checks with no `node_modules` present.
 *
 * @typedef {object} ApiPokestopIncident
 * @property {number} character 0 for non-rocket (showcase/goldstop/kecleon)
 * @property {number} expiration
 * @property {number} display_type 7 goldstop, 8 kecleon, 9 showcase
 * @property {boolean} confirmed
 * @property {number} [slot_1_pokemon_id]
 * @property {number} [slot_1_form]
 * @property {number} [slot_2_pokemon_id]
 * @property {number} [slot_2_form]
 * @property {number} [slot_3_pokemon_id]
 * @property {number} [slot_3_form]
 */

/**
 * Maps a Golbat invasion entry to ReactMap's `invasionProps` shape (the exact
 * key set `Pokestop.mapRDM` puts on each `pokestop.invasions[]` entry).
 * `character` → `grunt_type` and `expiration` → `incident_expire_timestamp`
 * are the only renames; slots pass through by name.
 *
 * @param {ApiPokestopIncident} inc
 */
function mapInvasion(inc) {
  return {
    incident_expire_timestamp: inc.expiration,
    grunt_type: inc.character,
    display_type: inc.display_type,
    confirmed: inc.confirmed,
    slot_1_pokemon_id: inc.slot_1_pokemon_id,
    slot_1_form: inc.slot_1_form,
    slot_2_pokemon_id: inc.slot_2_pokemon_id,
    slot_2_form: inc.slot_2_form,
    slot_3_pokemon_id: inc.slot_3_pokemon_id,
    slot_3_form: inc.slot_3_form,
  }
}

/**
 * Builds one quest-layer object shaped like a `mapRDM` quest, or `null` when
 * the layer has no active quest. Mirrors `mapRDM`'s `if (quest.quest_reward_type)
 * push`. Golbat returns `quest_rewards` as native JSON (an array of
 * `{type, info}`) or `null` — see Golbat commit `1c86576`, `jsonRaw()` — so we
 * read the reward type directly with NO `JSON.parse`. The reward array is passed
 * through unchanged as `quest_rewards`; `secondaryFilter`'s `parseRdmRewards`
 * consumes it in-place to expand the per-type `info` fields (Task 2 makes it
 * tolerant of an object as well as a legacy string).
 *
 * @param {Record<string, any>} api
 * @param {'' | 'alternative_'} prefix
 * @param {boolean} withAr
 * @returns {Record<string, any> | null}
 */
function buildQuestLayer(api, prefix, withAr) {
  const rewards = api[`${prefix}quest_rewards`]
  if (!Array.isArray(rewards) || rewards.length === 0) return null
  const questRewardType = rewards[0]?.type
  if (!questRewardType) return null
  return {
    quest_type: api[`${prefix}quest_type`],
    quest_timestamp: api[`${prefix}quest_timestamp`],
    quest_target: api[`${prefix}quest_target`],
    quest_conditions: api[`${prefix}quest_conditions`],
    quest_rewards: rewards,
    quest_reward_type: questRewardType,
    quest_title: api[`${prefix}quest_title`],
    with_ar: withAr,
  }
}

/**
 * Maps one Golbat pokestop to the row shape `Pokestop.secondaryFilter` expects
 * (i.e. one `mapRDM` output entry). Returns `null` for disabled/deleted stops,
 * mirroring `mapRDM`'s `if (!result.enabled || result.deleted) continue`.
 *
 * `quest_*` = AR layer (`with_ar:true`), `alternative_quest_*` = non-AR layer
 * (`with_ar:false`); each is pushed only when its reward type is derivable, so
 * `quests` holds 0, 1, or 2 entries. Every returned incident (grunt AND
 * showcase/goldstop/kecleon event rows) is mapped into `invasions`;
 * `secondaryFilter` splits them into `invasions[]`/`events[]`/incident-blocker.
 * Golbat prunes expired incidents server-side (`CollectPokestopIncidents`
 * keeps `expiration > now`), so no expiry filter is applied here.
 *
 * @param {Record<string, any>} api one ApiPokestopResult
 * @returns {Record<string, any> | null}
 */
function mapScanPokestop(api) {
  if (!api.enabled || api.deleted) return null
  const quests = []
  const base = buildQuestLayer(api, '', true)
  if (base) quests.push(base)
  const alt = buildQuestLayer(api, 'alternative_', false)
  if (alt) quests.push(alt)
  return {
    id: api.id,
    lat: api.lat,
    lon: api.lon,
    enabled: api.enabled,
    url: api.url,
    name: api.name,
    last_modified_timestamp: api.last_modified_timestamp,
    updated: api.updated,
    ar_scan_eligible: api.ar_scan_eligible,
    power_up_points: api.power_up_points,
    power_up_level: api.power_up_level,
    power_up_end_timestamp: api.power_up_end_timestamp,
    lure_id: api.lure_id,
    lure_expire_timestamp: api.lure_expire_timestamp,
    showcase_expiry: api.showcase_expiry,
    showcase_pokemon_id: api.showcase_pokemon_id,
    showcase_pokemon_form_id: api.showcase_pokemon_form_id,
    showcase_pokemon_type_id: api.showcase_pokemon_type_id,
    showcase_ranking_standard: api.showcase_ranking_standard,
    showcase_rankings: api.showcase_rankings,
    quests,
    invasions: (api.invasions || []).map(mapInvasion),
  }
}

module.exports = { mapScanPokestop, buildQuestLayer, mapInvasion }
```

- [ ] **Step 2: Golden-check the mapper under plain node**

Create `pokestop-mapper-golden.js` in the repo root (throwaway — delete after):

```js
const { mapScanPokestop } = require('./server/src/models/pokestopScanMapper')

const api = {
  id: 'abc.16',
  lat: 1.5,
  lon: 2.5,
  enabled: true,
  deleted: false,
  url: 'http://x/img.png',
  name: 'Test Stop',
  last_modified_timestamp: 100,
  updated: 200,
  ar_scan_eligible: 1,
  power_up_points: 50,
  power_up_level: 1,
  power_up_end_timestamp: 300,
  lure_id: 501,
  lure_expire_timestamp: 999,
  showcase_expiry: 1234,
  showcase_pokemon_id: 25,
  showcase_pokemon_form_id: 0,
  showcase_pokemon_type_id: 0,
  showcase_ranking_standard: 1,
  showcase_rankings: '{"total_entries":3}',
  quest_type: 7,
  quest_timestamp: 400,
  quest_target: 3,
  quest_conditions: '[{"type":1}]',
  quest_title: 'catch',
  quest_rewards: [{ type: 7, info: { pokemon_id: 25, form_id: 0 } }],
  alternative_quest_type: 4,
  alternative_quest_timestamp: 410,
  alternative_quest_target: 5,
  alternative_quest_conditions: '[]',
  alternative_quest_title: 'spin',
  alternative_quest_rewards: [{ type: 3, info: { amount: 1000 } }],
  invasions: [
    {
      id: 'i1',
      character: 12,
      expiration: 1500,
      display_type: 1,
      confirmed: true,
      slot_1_pokemon_id: 63,
      slot_1_form: 0,
    },
    {
      id: 'i2',
      character: 0,
      expiration: 1600,
      display_type: 9,
      confirmed: false,
    },
  ],
}

const out = mapScanPokestop(api)
const assert = (cond, msg) => {
  if (!cond) throw new Error(`FAIL: ${msg}`)
  console.log(`ok: ${msg}`)
}

assert(out.id === 'abc.16' && out.lat === 1.5, 'core fields copied')
assert(
  out.lure_id === 501 && out.showcase_expiry === 1234,
  'lure+showcase copied',
)
assert(out.quests.length === 2, 'two quest layers')
assert(
  out.quests[0].with_ar === true && out.quests[0].quest_reward_type === 7,
  'AR layer type 7',
)
assert(
  out.quests[1].with_ar === false && out.quests[1].quest_reward_type === 4,
  'non-AR layer type 4',
)
assert(
  out.quests[0].quest_rewards === api.quest_rewards &&
    Array.isArray(out.quests[0].quest_rewards),
  'native rewards array passed through (not stringified)',
)
assert(
  !('key' in out.quests[0]) && !('candy_pokemon_id' in out.quests[1]),
  'mapper does not compute key or expand info',
)
assert(out.invasions.length === 2, 'both incidents mapped')
assert(
  out.invasions[0].grunt_type === 12 &&
    out.invasions[0].incident_expire_timestamp === 1500,
  'grunt renamed character/expiration',
)
assert(
  out.invasions[1].grunt_type === 0 && out.invasions[1].display_type === 9,
  'showcase event row kept with grunt_type 0',
)

assert(mapScanPokestop({ ...api, enabled: false }) === null, 'disabled -> null')
assert(
  mapScanPokestop({ ...api, enabled: true, deleted: true }) === null,
  'deleted -> null',
)
const noAlt = mapScanPokestop({ ...api, alternative_quest_rewards: null })
assert(
  noAlt.quests.length === 1 && noAlt.quests[0].with_ar === true,
  'missing alt layer -> one quest',
)
const noType = mapScanPokestop({
  ...api,
  quest_rewards: [{ info: {} }],
  alternative_quest_rewards: null,
})
assert(
  noType.quests.length === 0,
  'rewards array without a type -> no quest, no throw',
)
const nonArray = mapScanPokestop({
  ...api,
  quest_rewards: 'unexpected',
  alternative_quest_rewards: null,
})
assert(nonArray.quests.length === 0, 'non-array rewards -> no quest, no throw')

console.log('\nALL GOLDEN CHECKS PASSED')
```

- [ ] **Step 3: Run the golden**

Run: `node pokestop-mapper-golden.js`
Expected: every `ok:` line prints, ending with `ALL GOLDEN CHECKS PASSED`. If any `FAIL:` prints, fix the mapper and re-run.

- [ ] **Step 4: Lint + format the mapper**

Run: `npx eslint server/src/models/pokestopScanMapper.js && npx prettier --check server/src/models/pokestopScanMapper.js`
Expected: no eslint errors; prettier reports the file uses the correct style (if prettier reports a style diff, run `npx prettier --write server/src/models/pokestopScanMapper.js` and re-run eslint).

- [ ] **Step 5: Delete the golden and commit**

```bash
rm pokestop-mapper-golden.js
git add server/src/models/pokestopScanMapper.js
git commit -m "feat(pokestop): add pokestopScanMapper for Golbat scan rows"
```

---

### Task 2: `Pokestop.getAll` — `mem` branch via `/api/pokestop/scan`

**Files:**

- Modify: `server/src/models/Pokestop.js` (imports; ctx destructure ~188-201; insert branch before `const results = await query` at ~809; one-line `parseRdmRewards` tolerance ~2078)
- Verify: `npx eslint`/`npx prettier`, reasoning, and a **deferred LIVE golden** (see acceptance gate)

**Interfaces:**

- Consumes: `mapScanPokestop` from Task 1; existing in-scope vars `midnight`, `ts`, `queryLimits`, `areaRestrictions`, `onlyAreas`, `effectiveOnlyArEligible`, `effectiveQuestLayer`, `perms`, `hasMultiInvasions`, `hasConfirmed`; existing `this.secondaryFilter`.
- Produces: the same array-of-marker-objects `secondaryFilter` already returns; no signature change visible to callers (`resolvers.js` `pokestops` → `Db.query('Pokestop', 'getAll', perms, args)`). `DbManager.getDbContext` already overlays `mem`/`secret`/`httpAuth` onto each source (that's how `getAvailable` receives them), so only the destructure needs them added.

- [ ] **Step 1: Add imports**

In `server/src/models/Pokestop.js`, the imports currently include (line ~10) `const { log, TAGS } = require('@rm/logger')` and (line ~15) `const { fetchJson } = require('../utils/fetchJson')`. Add these three imports directly beneath the existing util imports (after line ~15):

```js
const {
  evalScannerQuery,
  describeScannerResponse,
} = require('../utils/evalScannerQuery')
const { filterRTree } = require('../utils/filterRTree')
const { mapScanPokestop } = require('./pokestopScanMapper')
```

- [ ] **Step 2: Add `mem, secret, httpAuth` to the `getAll` ctx destructure**

Change the `getAll` ctx destructure (lines ~191-201) from:

```js
    {
      isMad,
      hasAltQuests,
      hasMultiInvasions,
      multiInvasionMs,
      hasRewardAmount,
      hasLayerColumn,
      hasPowerUp,
      hasConfirmed,
    },
```

to (append the three fields):

```js
    {
      isMad,
      hasAltQuests,
      hasMultiInvasions,
      multiInvasionMs,
      hasRewardAmount,
      hasLayerColumn,
      hasPowerUp,
      hasConfirmed,
      mem,
      secret,
      httpAuth,
    },
```

- [ ] **Step 3: Insert the `mem` branch before query execution**

In `getAll`, find (line ~809):

```js
const results = await query
```

Insert the following block **immediately before** that line (so on the endpoint happy path it returns before executing the SQL query; on failure it falls through to the unchanged SQL path — a dual source runs the SQL on its bound knex, a pure-endpoint source has no knex so `this.query()` already threw earlier and its result is dropped by the caller):

```js
// Endpoint-backed source: fetch the DNF-less match-all scan and map each
// Golbat row into the mapRDM shape secondaryFilter expects. Mirrors
// Gym.getAll — the same secondaryFilter runs for both SQL and endpoint
// rows. `with_incidents:true` makes Golbat attach invasions[] (grunts +
// showcase/goldstop/kecleon event rows). On any failure/bad-shape we log
// and fall through to the SQL block below.
if (mem) {
  try {
    const res = await evalScannerQuery(
      TAGS.pokestops,
      `${mem}/api/pokestop/scan`,
      JSON.stringify({
        min: { latitude: args.minLat, longitude: args.minLon },
        max: { latitude: args.maxLat, longitude: args.maxLon },
        limit: queryLimits.pokestops,
        filters: [],
        with_incidents: true,
      }),
      'POST',
      secret,
      httpAuth,
    )
    if (res && Array.isArray(res.pokestops)) {
      const mapped = res.pokestops
        .map(mapScanPokestop)
        .filter(
          (stop) => stop && filterRTree(stop, areaRestrictions, onlyAreas),
        )
      if (mapped.length > queryLimits.pokestops) {
        mapped.length = queryLimits.pokestops
      }
      return this.secondaryFilter(
        mapped,
        args.filters,
        false,
        ts,
        midnight,
        perms,
        hasMultiInvasions,
        hasConfirmed,
        effectiveOnlyArEligible,
        effectiveQuestLayer,
      )
    }
    log.warn(
      TAGS.pokestops,
      `[POKESTOP] /api/pokestop/scan gave no pokestops array — ${describeScannerResponse(
        res,
      )} — falling back to SQL for this source`,
    )
  } catch (e) {
    log.warn(
      TAGS.pokestops,
      `[POKESTOP] /api/pokestop/scan error — falling back to SQL for this source: ${e}`,
    )
  }
}
```

- [ ] **Step 4: Make `parseRdmRewards` tolerant of native-object rewards**

The mapper passes `quest_rewards` through as a native array (Golbat now returns it as native JSON). `parseRdmRewards` currently assumes a string and calls `JSON.parse`. Add a one-line tolerance so it accepts either form — the SQL/MAD path still passes a string and is unchanged; this mirrors the `typeof … === 'string' ? JSON.parse : …` pattern `secondaryFilter` already uses for `showcase_rankings`.

Find (in `parseRdmRewards`, ~line 2078):

```js
const rewards = JSON.parse(quest.quest_rewards)
```

Replace with:

```js
const rewards =
  typeof quest.quest_rewards === 'string'
    ? JSON.parse(quest.quest_rewards)
    : quest.quest_rewards
```

- [ ] **Step 5: Lint + format**

Run: `npx eslint server/src/models/Pokestop.js && npx prettier --check server/src/models/Pokestop.js`
Expected: no eslint errors. If prettier reports a diff, run `npx prettier --write server/src/models/Pokestop.js` then re-run eslint.

- [ ] **Step 6: Reasoning check (no runtime test possible without a live Golbat)**

Confirm by reading the final diff:

- `secondaryFilter` is called with `isMad=false` (the mapper only produces RDM-shaped rows).
- The mapped rows carry `quests` with `quest_reward_type` set (so `secondaryFilter`'s `if (quest.quest_reward_type ...)` gate works) and `quest_rewards` as the native array; `parseRdmRewards` (now object-tolerant, Step 4) expands the per-type `info` fields from it. `quest_rewards` is a dead wire field (not selected by any client query), so passing it through as an object is safe.
- The `filters:[]` match-all body means `secondaryFilter` applies all real filtering (as gyms/stations do). The `queryLimits.pokestops` cap mirrors the SQL path's `normalized.length = queryLimits.pokestops`.
- The area early-return `if (!getAreaSql(...)) return []` at ~284 still runs before this branch, so a no-visible-area user returns `[]` without an endpoint call.
- The SQL/MAD path is unchanged: `parseRdmRewards` still `JSON.parse`s the string it gets from the DB.

- [ ] **Step 7: Commit**

```bash
git add server/src/models/Pokestop.js
git commit -m "feat(pokestop): getAll via /api/pokestop/scan (match-all) with SQL fallback"
```

**Acceptance gate (deferred, run by the user against a deployed Golbat #385, `fort_in_memory` on, a dual pokestop source):** a LIVE golden comparing endpoint vs SQL for the same bbox — stop count, quest markers (both AR/non-AR layers, reward-type icons for xp/item/stardust/candy/pokemon/xl-candy/mega), invasion markers (grunt/leader/giovanni + confirmed lineups), showcase `events[]`, lure markers, `incident_blocker_*`, and `ar_scan_eligible` — must match. Exercise `onlyQuests`/`onlyInvasions`/`onlyLures`/`onlyEventStops`/`onlyArEligible` and a `questLayerMode` set to a single layer. This gate is the real parity proof; the mapper's node golden only covers the pure transform.

---

### Task 3: `Pokestop.getOne` — `mem` branch via `/api/pokestop/id/{id}`

**Files:**

- Modify: `server/src/models/Pokestop.js` (`getOne`, ~2507-2515)
- Verify: `npx eslint`/`npx prettier`, reasoning

**Interfaces:**

- Consumes: `evalScannerQuery`, `TAGS`, `log` (imported in Task 2); the `source` object `DbManager.getOne` passes as the 2nd arg already carries `mem`/`secret`/`httpAuth`.
- Produces: same contract as today — an object with at least `lat`/`lon` (used by the `pokestopsSingle` resolver for recenter). Mirrors `Gym.getOne`.

- [ ] **Step 1: Replace `getOne` with the `mem`-aware version**

Change (lines ~2507-2515):

```js
  static getOne(id, { isMad }) {
    return this.query()
      .select([
        isMad ? 'latitude AS lat' : 'lat',
        isMad ? 'longitude AS lon' : 'lon',
      ])
      .where(isMad ? 'pokestop_id' : 'id', id)
      .first()
  }
```

to:

```js
  static async getOne(id, { isMad, mem, secret, httpAuth }) {
    if (mem) {
      try {
        const res = await evalScannerQuery(
          TAGS.pokestops,
          `${mem}/api/pokestop/id/${id}`,
          undefined,
          'GET',
          secret,
          httpAuth,
        )
        if (res && typeof res === 'object' && 'lat' in res && 'lon' in res) {
          return res
        }
      } catch (e) {
        log.warn(
          TAGS.pokestops,
          `[POKESTOP] /api/pokestop/id error — falling back to SQL: ${e}`,
        )
      }
    }
    return this.query()
      .select([
        isMad ? 'latitude AS lat' : 'lat',
        isMad ? 'longitude AS lon' : 'lon',
      ])
      .where(isMad ? 'pokestop_id' : 'id', id)
      .first()
  }
```

- [ ] **Step 2: Lint + format**

Run: `npx eslint server/src/models/Pokestop.js && npx prettier --check server/src/models/Pokestop.js`
Expected: no eslint errors; prettier clean (or `--write` then re-lint).

- [ ] **Step 3: Reasoning check**

Confirm the branch matches `Gym.getOne` exactly except for the endpoint path (`/api/pokestop/id/`) and the `TAGS.pokestops` tag: `mem` truthy → GET by id → return the object when it has `lat`/`lon`, else fall through to the unchanged SQL query. `DbManager.getOne` de-dupes across sources, so returning the whole `ApiPokestopResult` (a superset of `{lat, lon}`) is safe — downstream only reads `lat`/`lon`.

- [ ] **Step 4: Commit**

```bash
git add server/src/models/Pokestop.js
git commit -m "feat(pokestop): getOne via /api/pokestop/id with SQL fallback"
```

---

## Self-Review

**Spec coverage** (against `2026-07-16-fort-scan-map-data-design.md` + the fort-consumer pattern):

- `getAll` markers via `/api/pokestop/scan` (`with_incidents`, `res.pokestops` envelope) → Task 2. ✅
- `getOne` via `/api/pokestop/id/{id}` (bare object) → Task 3. ✅
- `getAvailable` — already shipped (#1227), untouched. ✅
- Row mapper (flat `quest_*`/`alternative_quest_*` + `invasions[]` + showcase → `quests[]`/`invasions[]`/`events[]`) → Task 1, with the derive-`quest_reward_type` step; `events[]` + incident-blocker assembled by the unchanged `secondaryFilter`. ✅
- Dual-source SQL fallback + `filterRTree` area restriction → Task 2. ✅
- Reuse `secondaryFilter` verbatim + one-line `parseRdmRewards` object-tolerance (gym pattern) → Tasks 1-2. ✅
- Golbat `quest_rewards`/`alternative_quest_rewards` native JSON (Golbat commit `1c86576`) so the mapper reads `quest_rewards[0].type` without `JSON.parse` → prerequisite done. ✅

**Placeholder scan:** no TBD/TODO; every code step carries complete code. ✅

**Type consistency:** `mapScanPokestop`/`buildQuestLayer`/`mapInvasion` names and the produced key set are consistent between Task 1's definition, its golden, and Task 2's consumer. `secondaryFilter` is called with the exact 10-arg signature from `Pokestop.js:816-827`. ✅

**Deliberate divergences documented:** (1) mapper skips a layer whose `quest_rewards` isn't a non-empty array with a `[0].type` (defensive; no throw). (2) no client-side incident-expiry filter — Golbat prunes server-side (`CollectPokestopIncidents` keeps `expiration > now`), matching how the stations slice delegated battle pruning. (3) `getAll` uses the shared `evalScannerQuery`/`describeScannerResponse` (like gyms/stations `getAll`) while `getAvailable` keeps its older `this.evalQuery` — intentional; migrating `getAvailable` is out of scope. (4) one-line `parseRdmRewards` object-tolerance is the sole shared-code edit; the SQL/MAD path still hits the string branch unchanged.
