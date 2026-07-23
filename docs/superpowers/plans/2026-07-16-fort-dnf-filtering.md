# Fort DNF Filtering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Push ReactMap's per-type fort filters into Golbat's `/api/{gym,pokestop,station}/scan` as DNF clauses so the rtree scan returns only matching forts, instead of fetching the whole viewport and filtering entirely in `secondaryFilter`.

**Architecture:** Three pure ReactMap backends (`server/src/filters/fort/{gym,pokestop,station}.js`) translate `args.filters` into `ApiFortDnfFilter[]` clauses that replace the `filters: []` in each `getAll` `mem` branch. DNF is a best-effort **superset** narrow; the existing `secondaryFilter` stays untouched and finalizes exactness. One clean new Golbat DNF field (`stationed_gmax`) unblocks the station gmax narrow. An observability log shows both filter stages so the DNF gap is visible per query.

**Tech Stack:** Node.js (ReactMap backends), Go 1.26 (Golbat `stationed_gmax`). From spec `docs/superpowers/specs/2026-07-16-fort-dnf-filtering-design.md`.

## Global Constraints

- **Superset invariant (the one hard rule):** a DNF clause set must **never be stricter** than the real filter — it may over-return (secondaryFilter drops the extras) but must never drop a fort that should show. When unsure whether a constraint is expressible, **omit it** (broader fetch) rather than guess.
- **Poisoning rule:** fort filters combine with OR. A backend emits narrowing clauses only if it can express **every** active category. If any active category is a match-all toggle (`onlyAllGyms`/`onlyAllPokestops`/`onlyAllStations`) or an unexpressible gap, return **`[]`** (Golbat treats an empty top-level `filters` array as **match-all**, not match-nothing).
- **`secondaryFilter` (and the station JS gate) is untouched.** It always runs after the fetch and guarantees exactness. Do not move residual logic out of it.
- **Clause shape** = plain JS objects matching `ApiFortDnfFilter` json tags: id lists as `number[]`; id+form pairs as `{ pokemon_id, form }` (omit `form` = any form); ranges as `{ min, max }` — **always send both bounds** (an omitted bound defaults to 0, so min-only never matches); bools as `true`. A field left unset = unconstrained.
- **Residual (stays in `secondaryFilter`, never a DNF clause; poison to `[]` when active):** quest **title/target** (`adv`), raid/battle/invasion **gender**, invasion **confirmed**, gym **ex-eligible / in-battle**, gym **badges** (`onlyGymBadges`/`onlyBadge` — ReactMap-local badge join), pokestop **rocket-reward `a<pokemon>` keys** (secondaryFilter matches UNCONFIRMED invasions by the grunt type's possible encounters, not the confirmed slot — inexpressible without the event reward→grunt map), station **active/inactive / upcoming** time windows.
- **No test runner** in ReactMap (maintainer opted out). Verify each backend with a throwaway `node` golden (run, confirm, delete — never `git add`), `npx eslint`, `npx prettier --check`, + reasoning. No test framework, no committed test files. Golbat uses `go test`.
- **Commit subjects lowercase** (commitlint). ReactMap pushes to `fork` (jfberry), PR #1228. Golbat pushes to `origin`, PR #385.
- **Scan body is unchanged otherwise:** `{ min:{latitude,longitude}, max:{...}, limit, filters:<clauses>, with_incidents? }`. `res.examined` (envelope) = forts examined in viewport; `res.<type>.length` = DNF-returned; post-filter length = final.

---

## File Structure

- **Create `server/src/filters/fort/describeDnfNarrowing.js`** — shared log-string builder (Task 2).
- **Create `server/src/filters/fort/gym.js`** — `buildGymDnfFilters(filters)` (Task 2).
- **Create `server/src/filters/fort/pokestop.js`** — `buildPokestopDnfFilters(filters)` (Task 3).
- **Create `server/src/filters/fort/station.js`** — `buildStationDnfFilters(filters)` (Task 4).
- **Modify** `server/src/models/Gym.js`, `Pokestop.js`, `Station.js` — swap `filters: []` for the backend call + add the observability log in each `mem` branch.
- **Modify Golbat** `decoder/api_fort.go`, `decoder/fortRtree.go`, `decoder/station_battle.go`(if the battle-lookup builder needs it), `decoder/api_fort_test.go` — the `stationed_gmax` field (Task 1).

---

### Task 1: Golbat `stationed_gmax` DNF field

**Repo/branch:** Golbat `/Users/james/GolandProjects/Golbat-wt/pokestop-available-api`, branch `feat/fort-scan-map-data`.

**Files:**

- Modify: `decoder/api_fort.go` (`ApiFortDnfFilter` struct; `isFortDnfMatch` STATION case)
- Modify: `decoder/fortRtree.go` (`FortLookup` struct; `updateStationLookupWithBattles`)
- Test: `decoder/api_fort_dnf_gmax_test.go` (new)

**Interfaces:**

- Produces: `ApiFortDnfFilter.StationedGmax *bool` (json `stationed_gmax`) — when `true`, matches stations with `> 0` stationed Gigantamax pokemon. Task 4's `buildStationDnfFilters` emits `{ stationed_gmax: true }`.

- [ ] **Step 1: Add the FortLookup field**

In `decoder/fortRtree.go`, in the `FortLookup` struct's `// Station` section (next to `BattleLevel`/`BattlePokemonId`), add:

```go
	TotalStationedGmax int16
```

- [ ] **Step 2: Populate it in the station lookup builder**

In `decoder/fortRtree.go`, `updateStationLookupWithBattles`, add the field to the `FortLookup` literal:

```go
	lookup := FortLookup{
		FortType:           STATION,
		Lat:                station.Lat,
		Lon:                station.Lon,
		StationBattles:     battles,
		TotalStationedGmax: int16(station.TotalStationedGmax.ValueOrZero()),
	}
```

- [ ] **Step 3: Add the filter field**

In `decoder/api_fort.go`, in the `ApiFortDnfFilter` struct's `// Station` section (next to `BattleLevel`/`BattlePokemon`), add:

```go
	StationedGmax *bool `json:"stationed_gmax" required:"false" doc:"Station only: when true, only match stations with at least one stationed Gigantamax pokemon; null means no constraint."`
```

- [ ] **Step 4: Evaluate it in isFortDnfMatch**

In `decoder/api_fort.go`, in `isFortDnfMatch`, at the **start** of the `case STATION:` block (before the `if filter.BattleLevel != nil || filter.BattlePokemon != nil {` line), add:

```go
	case STATION:
		if filter.StationedGmax != nil && *filter.StationedGmax && fortLookup.TotalStationedGmax <= 0 {
			return false
		}
		if filter.BattleLevel != nil || filter.BattlePokemon != nil {
```

(Only the two new lines are inserted; the existing battle block is unchanged.)

- [ ] **Step 5: Write the unit test**

Create `decoder/api_fort_dnf_gmax_test.go`:

```go
package decoder

import "testing"

func TestIsFortDnfMatch_StationedGmax(t *testing.T) {
	gmax := true
	withGmax := FortLookup{FortType: STATION, TotalStationedGmax: 3}
	noGmax := FortLookup{FortType: STATION, TotalStationedGmax: 0}
	now := int64(1000)

	if !isFortDnfMatch(ApiFortDnfFilter{StationedGmax: &gmax}, withGmax, STATION, now) {
		t.Error("station with stationed gmax should match stationed_gmax:true")
	}
	if isFortDnfMatch(ApiFortDnfFilter{StationedGmax: &gmax}, noGmax, STATION, now) {
		t.Error("station without stationed gmax must not match stationed_gmax:true")
	}
	// null gmax filter is a wildcard — matches either
	if !isFortDnfMatch(ApiFortDnfFilter{}, noGmax, STATION, now) {
		t.Error("no stationed_gmax constraint should match any station")
	}
}
```

Note: confirm `isFortDnfMatch`'s signature (arg order/type of `now`) from `api_fort.go` before running — adjust the call if it differs.

- [ ] **Step 6: Build + test**

Run: `cd /Users/james/GolandProjects/Golbat-wt/pokestop-available-api && gofmt -w decoder/*.go && go build -tags go_json ./decoder/ && go test ./decoder/ -run 'TestIsFortDnfMatch_StationedGmax|TestApiResultsExposeEveryDbColumn|Golden' -count=1`
Expected: build OK; tests PASS (the completeness/golden tests are unaffected — no `Api*Result` change).

- [ ] **Step 7: Commit + push**

```bash
git add decoder/api_fort.go decoder/fortRtree.go decoder/api_fort_dnf_gmax_test.go
git commit -m "feat(dnf): add stationed_gmax fort filter for stations"
git push origin feat/fort-scan-map-data
```

---

### Task 2: Gym DNF backend + wiring + observability log

**Repo/branch:** ReactMap `/Users/james/dev/ReactMap`, branch `feat/fort-consumer`.

**Files:**

- Create: `server/src/filters/fort/describeDnfNarrowing.js`
- Create: `server/src/filters/fort/gym.js`
- Modify: `server/src/models/Gym.js` (the `mem` branch, ~524-566)

**Interfaces:**

- Produces: `buildGymDnfFilters(filters) → ApiFortDnfFilter[]` (consumed by `Gym.getAll`); `describeDnfNarrowing(label, clauses, examined, returned, final) → string` (consumed by all three model tasks).

- [ ] **Step 1: Write the shared log helper**

Create `server/src/filters/fort/describeDnfNarrowing.js`:

```js
// @ts-check

/**
 * Builds the DNF observability log line showing both filter stages, so a large
 * secondaryFilter (residual) drop flags where DNF is leaving narrowing on the
 * table. `clauses` is the number of DNF clauses sent (0 = match-all).
 *
 * @param {string} label e.g. 'GYM'
 * @param {number} clauses
 * @param {number} examined forts examined in the viewport (res.examined)
 * @param {number} returned forts Golbat returned after DNF (res.<type>.length)
 * @param {number} final forts left after secondaryFilter
 * @returns {string}
 */
function describeDnfNarrowing(label, clauses, examined, returned, final) {
  const byDnf = examined - returned
  const bySecondary = returned - final
  return `[${label}] DNF(${clauses} clauses): ${examined} in viewport, -${byDnf} by DNF -> ${returned}, -${bySecondary} by secondaryFilter -> ${final} final`
}

module.exports = { describeDnfNarrowing }
```

- [ ] **Step 2: Write the gym backend**

Create `server/src/filters/fort/gym.js`. Mirrors the `Gym.getAll` key switch (`Gym.js:232-262`): `e`→`raid_level`, `t`→`team_id`, `g`→`team_id`+`available_slots` (slot base passed as a `slotCount` param = `baseGymSlotAmounts.length`), bare `<id>-<form>`→`raid_pokemon_id` (Golbat's tag for the raid boss pair — NOT `raid_pokemon`; gender residual). `r`/`o` ignored. Any of `onlyAllGyms`/`onlyExEligible`/`onlyInBattle` active ⇒ match-all (poison). `onlyArEligible`→`is_ar_scan_eligible:true` (its own clause). `onlyLevels` (power-up) stays **residual** — it only applies in `onlyAllGyms` mode (which poisons to `[]`), and the `getAll` `active` JS filter handles it; emitting `power_up_level` would under-return.

```js
// @ts-check

// Mirror of the gym per-slot layout the SQL path uses (Gym.getAll's `g` key
// computes available_slots = baseGymSlotAmounts.length - slotIndex). 6 slots.
const GYM_SLOT_COUNT = 6

/**
 * Translate a gym's `args.filters` into Golbat ApiFortDnfFilter[] clauses.
 * DNF is a superset narrow; secondaryFilter finalizes (gender, ex-eligible,
 * in-battle, badges stay residual). Returns [] (match-all) when any active
 * category can't be expressed.
 *
 * @param {Record<string, any>} filters args.filters
 * @returns {object[]}
 */
function buildGymDnfFilters(filters) {
  if (!filters || typeof filters !== 'object') return []
  const {
    onlyAllGyms,
    onlyExEligible,
    onlyInBattle,
    onlyArEligible,
    onlyLevels,
  } = filters
  // Poison: these categories have no DNF expression -> must fetch all.
  if (onlyAllGyms || onlyExEligible || onlyInBattle) return []

  const powerUp =
    onlyLevels && onlyLevels !== 'all' && Number.isFinite(Number(onlyLevels))
      ? { min: Number(onlyLevels), max: Number(onlyLevels) }
      : undefined

  const clauses = []
  const eggs = []
  const teams = []

  Object.entries(filters).forEach(([key, value]) => {
    if (typeof key !== 'string' || key.length === 0) return
    switch (key.charAt(0)) {
      case 'o': // onlyX toggles handled above / not per-item
      case 'r': // dead raid-tier keys (unused by getAll)
        break
      case 'e':
        eggs.push(Number(key.slice(1)))
        break
      case 't':
        teams.push(Number(key.slice(1).split('-')[0]))
        break
      case 'g': {
        const [team, slotIndex] = key.slice(1).split('-')
        clauses.push({
          team_id: [Number(team)],
          available_slots: {
            min: GYM_SLOT_COUNT - Number(slotIndex),
            max: GYM_SLOT_COUNT - Number(slotIndex),
          },
        })
        break
      }
      default: {
        // raid boss "<id>-<form>" (default case in Gym.getAll)
        const [idPart, formPart] = key.split('-', 2)
        const id = Number(idPart)
        if (!Number.isFinite(id)) break
        const pair = { pokemon_id: id }
        if (
          formPart &&
          formPart !== 'null' &&
          Number.isFinite(Number(formPart))
        )
          pair.form = Number(formPart)
        // Golbat's json tag is `raid_pokemon_id` (unlike other types' `*_pokemon`)
        clauses.push({ raid_pokemon_id: [pair] })
        break
      }
    }
  })

  if (teams.length) clauses.push({ team_id: teams })
  if (eggs.length) clauses.push({ raid_level: eggs })
  if (onlyArEligible) clauses.push({ is_ar_scan_eligible: true })

  // If nothing narrowable was active, match-all (e.g. onlyRaids/onlyGyms only).
  if (clauses.length === 0) return []

  // power_up_level is a base narrow ANDed into every clause.
  if (powerUp) clauses.forEach((c) => (c.power_up_level = powerUp))
  return clauses
}

module.exports = { buildGymDnfFilters }
```

- [ ] **Step 3: Golden-check the gym backend under node**

Create `gym-dnf-golden.js` in the repo root (throwaway):

```js
const { buildGymDnfFilters } = require('./server/src/filters/fort/gym')
const A = (c, m) => {
  if (!c) throw new Error('FAIL ' + m)
  console.log('ok ' + m)
}
const J = (o) => JSON.stringify(o)

A(
  J(buildGymDnfFilters({ onlyAllGyms: true, t123: {} })) === '[]',
  'onlyAllGyms poisons -> match-all',
)
A(
  J(buildGymDnfFilters({ onlyExEligible: true })) === '[]',
  'onlyExEligible poisons',
)
A(
  J(buildGymDnfFilters({ onlyInBattle: true, e5: {} })) === '[]',
  'onlyInBattle poisons',
)

const teams = buildGymDnfFilters({ 't1-0': {}, 't2-0': {} })
A(J(teams) === J([{ team_id: [1, 2] }]), 'team keys -> one team_id clause')

const eggs = buildGymDnfFilters({ e5: {}, e6: {} })
A(J(eggs) === J([{ raid_level: [5, 6] }]), 'egg keys -> raid_level clause')

const slot = buildGymDnfFilters({ 'g2-1': {} })
A(
  J(slot) === J([{ team_id: [2], available_slots: { min: 5, max: 5 } }]),
  'g key -> team + slots',
)

const boss = buildGymDnfFilters({ '150-0': { gender: 2 } })
A(
  J(boss) === J([{ raid_pokemon_id: [{ pokemon_id: 150, form: 0 }] }]),
  'raid boss -> raid_pokemon_id (correct Golbat tag), gender dropped (residual)',
)

const ar = buildGymDnfFilters({ onlyArEligible: true, e5: {} })
A(
  J(ar) === J([{ raid_level: [5] }, { is_ar_scan_eligible: true }]),
  'onlyArEligible adds its own clause',
)

const lvl = buildGymDnfFilters({ 't1-0': {}, onlyLevels: '3' })
A(
  J(lvl) === J([{ team_id: [1], power_up_level: { min: 3, max: 3 } }]),
  'onlyLevels ANDs power_up into each clause',
)

A(
  J(buildGymDnfFilters({ onlyRaids: true })) === '[]',
  'no narrowable category -> match-all',
)
console.log('\nALL PASS')
```

- [ ] **Step 4: Run the golden**

Run: `node gym-dnf-golden.js`
Expected: all `ok` lines, ending `ALL PASS`. Fix the backend if any FAIL.

- [ ] **Step 5: Wire the gym mem branch**

In `server/src/models/Gym.js`, add the imports near the other util imports (after the `filterRTree` import):

```js
const { buildGymDnfFilters } = require('../filters/fort/gym')
const { describeDnfNarrowing } = require('../filters/fort/describeDnfNarrowing')
```

Then in the `mem` branch, replace the scan call + result block. Change `filters: []` to the DNF clauses and log the narrowing before returning:

```js
const dnf = buildGymDnfFilters(args.filters)
const res = await evalScannerQuery(
  TAGS.gyms,
  `${mem}/api/gym/scan`,
  JSON.stringify({
    min: { latitude: args.minLat, longitude: args.minLon },
    max: { latitude: args.maxLat, longitude: args.maxLon },
    limit: queryLimits.gyms,
    filters: dnf,
  }),
  'POST',
  secret,
  httpAuth,
)
if (res && Array.isArray(res.gyms)) {
  const active = res.gyms.filter(
    (gym) =>
      gym.enabled &&
      !gym.deleted &&
      (!hideOldGyms || gym.updated > ts - gymValidDataLimit * 86400) &&
      (!onlyAllGyms ||
        !onlyLevels ||
        onlyLevels === 'all' ||
        gym.power_up_level === Number(onlyLevels)) &&
      filterRTree(gym, areaRestrictions, onlyAreas),
  )
  const final = secondaryFilter(active)
  log.info(
    TAGS.gyms,
    describeDnfNarrowing(
      'GYM',
      dnf.length,
      res.examined,
      res.gyms.length,
      final.length,
    ),
  )
  return final
}
```

(The `filterRTree`/`secondaryFilter` logic is unchanged — only `filters: dnf`, capturing `final`, and the log line are new.)

- [ ] **Step 6: Lint**

Run: `npx eslint server/src/filters/fort/describeDnfNarrowing.js server/src/filters/fort/gym.js server/src/models/Gym.js && npx prettier --check server/src/filters/fort/describeDnfNarrowing.js server/src/filters/fort/gym.js server/src/models/Gym.js`
Expected: clean (or `--write` then re-lint).

- [ ] **Step 7: Delete golden + commit**

```bash
rm gym-dnf-golden.js
git add server/src/filters/fort/describeDnfNarrowing.js server/src/filters/fort/gym.js server/src/models/Gym.js
git commit -m "feat(gym): dnf filter backend + narrowing log"
```

---

### Task 3: Pokestop DNF backend + wiring

**Repo/branch:** ReactMap, branch `feat/fort-consumer`.

**Files:**

- Create: `server/src/filters/fort/pokestop.js`
- Modify: `server/src/models/Pokestop.js` (the `mem` branch, ~818-874)

**Interfaces:**

- Consumes: `describeDnfNarrowing` (Task 2).
- Produces: `buildPokestopDnfFilters(filters) → object[]` (consumed by `Pokestop.getAll`).

- [ ] **Step 1: Write the pokestop backend**

Create `server/src/filters/fort/pokestop.js`. Mirrors `Pokestop.getAll`'s reward-key switch + invasion/showcase keys. Reward keys map to **up to three separate OR clauses** by sub-field compatibility (Golbat ANDs the sub-fields WITHIN a clause, so merging incompatible reward families under-returns): **item** `q<item>`→`{quest_reward_type:[2], quest_reward_item_id:[items]}`; **pokemon-family** `c<pk>`/`x<pk>`/`m<pk>`/bare `<pk>[-<form>]`→`{quest_reward_type:[4/9/12/7…], quest_reward_pokemon:[…]}` (merging these types over-returns cross-type = safe superset); **type-only** `p`/`d`/`u<type>`→`{quest_reward_type:[1/3/…]}` (exact amount is residual). Invasion: `i<char>`→incident_character, `b<type>`→incident_display_type, `a<pk>-<form>`→incident_pokemon. Showcase: `f<pk>-<form>`→contest_pokemon, `h<type>`→contest_pokemon_type. Quest **title/target** (`adv`) is never in a clause (residual). `onlyAllPokestops` ⇒ match-all. `onlyArEligible`→is_ar_scan_eligible clause. `onlyLevels` (power-up) stays **residual** — like gyms it only applies in the `onlyAllPokestops` mode that poisons to `[]`, so emitting it would under-return.

```js
// @ts-check

/** push {pokemon_id, form?} from a "<id>[-<form>]" key onto arr */
function pushIdForm(arr, key, offset) {
  const [idPart, formPart] = key.slice(offset).split('-', 2)
  const id = Number(idPart)
  if (!Number.isFinite(id)) return
  const pair = { pokemon_id: id }
  if (formPart && formPart !== 'null' && Number.isFinite(Number(formPart)))
    pair.form = Number(formPart)
  arr.push(pair)
}

/**
 * Translate a pokestop's `args.filters` into ApiFortDnfFilter[] clauses.
 *
 * CRITICAL: Golbat ANDs the sub-fields WITHIN a clause, so different reward
 * families must NOT share a clause — `{quest_reward_type:[2,4],
 * quest_reward_item_id:[1], quest_reward_pokemon:[{25}]}` matches nothing (an
 * item quest has no reward pokemon → under-return). Emit up to three separate
 * OR'd quest clauses by sub-field compatibility: item (type 2 + item_id),
 * pokemon-family (types 4/7/9/12 + pokemon — merging types over-returns
 * cross-type, which is a safe superset), and type-only (types 1/3/u — amount is
 * dropped to the residual). DNF is a superset narrow; secondaryFilter finalizes
 * (quest title/target `adv`, invasion `confirmed`, exact amounts stay residual).
 * Returns [] (match-all) when a match-all toggle is active or nothing is set.
 *
 * @param {Record<string, any>} filters args.filters
 * @returns {object[]}
 */
function buildPokestopDnfFilters(filters) {
  if (!filters || typeof filters !== 'object') return []
  const { onlyAllPokestops, onlyArEligible } = filters
  if (onlyAllPokestops) return []
  // NOTE: no power_up_level. Like gyms, pokestop power-up filtering only applies
  // in `onlyAllPokestops` mode (which poisons to [] above), so a power_up_level
  // clause could only fire when the real filter does NOT restrict it — an
  // under-return. Power-up stays residual.

  const itemIds = [] // 'q' -> quest reward type 2
  const pokemonTypes = new Set() // 'c'/'x'/'m'/bare -> 4/9/12/7
  const pokemon = []
  const typeOnly = new Set() // 'p'/'d'/'u' -> 1/3/<type> (amount = residual)
  const lureId = []
  const incidentCharacter = []
  const incidentDisplayType = []
  const incidentPokemon = []
  const contestPokemon = []
  const contestPokemonType = []

  Object.entries(filters).forEach(([key]) => {
    if (typeof key !== 'string' || key.length === 0) return
    const n = Number(key.slice(1))
    switch (key.charAt(0)) {
      case 'o':
        break
      case 'l':
        if (Number.isFinite(n)) lureId.push(n)
        break
      case 'q':
        if (Number.isFinite(n)) itemIds.push(n)
        break
      case 'd':
        typeOnly.add(3)
        break
      case 'p':
        typeOnly.add(1)
        break
      case 'u':
        if (Number.isFinite(n)) typeOnly.add(n)
        break
      case 'c':
        pokemonTypes.add(4)
        pushIdForm(pokemon, key, 1)
        break
      case 'x':
        pokemonTypes.add(9)
        pushIdForm(pokemon, key, 1)
        break
      case 'm': {
        // key is `m<pokemon_id>-<amount>` (NOT <id>-<form>): mega rewards have
        // no form. Take the id only; the amount stays residual (secondaryFilter
        // narrows via the m<pk>-<amt> key). Using pushIdForm here would treat
        // the amount as a form and Golbat would return zero (under-return).
        pokemonTypes.add(12)
        const megaId = Number(key.slice(1).split('-')[0])
        if (Number.isFinite(megaId)) pokemon.push({ pokemon_id: megaId })
        break
      }
      case 'i':
        if (Number.isFinite(n)) incidentCharacter.push(n)
        break
      case 'b':
        if (Number.isFinite(n)) incidentDisplayType.push(n)
        break
      case 'a':
        pushIdForm(incidentPokemon, key, 1)
        break
      case 'f':
        pushIdForm(contestPokemon, key, 1)
        break
      case 'h':
        if (Number.isFinite(n)) contestPokemonType.push(n)
        break
      default: {
        // bare "<pokemon>[-<form>]" = quest reward type 7 (pokemon encounter)
        const [idPart] = key.split('-', 2)
        if (Number.isFinite(Number(idPart))) {
          pokemonTypes.add(7)
          pushIdForm(pokemon, key, 0)
        }
        break
      }
    }
  })

  const clauses = []
  if (itemIds.length)
    clauses.push({ quest_reward_type: [2], quest_reward_item_id: itemIds })
  if (pokemon.length)
    clauses.push({
      quest_reward_type: [...pokemonTypes],
      quest_reward_pokemon: pokemon,
    })
  if (typeOnly.size) clauses.push({ quest_reward_type: [...typeOnly] })
  if (lureId.length) clauses.push({ lure_id: lureId })
  if (incidentCharacter.length)
    clauses.push({ incident_character: incidentCharacter })
  if (incidentDisplayType.length)
    clauses.push({ incident_display_type: incidentDisplayType })
  if (incidentPokemon.length)
    clauses.push({ incident_pokemon: incidentPokemon })
  if (contestPokemon.length) clauses.push({ contest_pokemon: contestPokemon })
  if (contestPokemonType.length)
    clauses.push({ contest_pokemon_type: contestPokemonType })
  if (onlyArEligible) clauses.push({ is_ar_scan_eligible: true })

  return clauses.length ? clauses : []
}

module.exports = { buildPokestopDnfFilters }
```

- [ ] **Step 2: Golden-check the pokestop backend**

Create `pokestop-dnf-golden.js` (throwaway):

```js
const {
  buildPokestopDnfFilters,
} = require('./server/src/filters/fort/pokestop')
const A = (c, m) => {
  if (!c) throw new Error('FAIL ' + m)
  console.log('ok ' + m)
}
const J = (o) => JSON.stringify(o)

A(
  J(buildPokestopDnfFilters({ onlyAllPokestops: true, q1: {} })) === '[]',
  'onlyAllPokestops -> match-all',
)
A(J(buildPokestopDnfFilters({ l501: {} })) === J([{ lure_id: [501] }]), 'lure')
A(
  J(buildPokestopDnfFilters({ q1: {} })) ===
    J([{ quest_reward_type: [2], quest_reward_item_id: [1] }]),
  'item quest -> type2 + item',
)
A(
  J(buildPokestopDnfFilters({ p1000: {} })) === J([{ quest_reward_type: [1] }]),
  'xp quest -> type1 only (amount is residual)',
)
A(
  J(buildPokestopDnfFilters({ c25: {} })) ===
    J([{ quest_reward_type: [4], quest_reward_pokemon: [{ pokemon_id: 25 }] }]),
  'candy quest -> type4 + pokemon',
)
A(
  J(buildPokestopDnfFilters({ '150-0': {} })) ===
    J([
      {
        quest_reward_type: [7],
        quest_reward_pokemon: [{ pokemon_id: 150, form: 0 }],
      },
    ]),
  'pokemon-reward quest -> type7 + pokemon+form',
)
A(
  J(buildPokestopDnfFilters({ i5: {} })) === J([{ incident_character: [5] }]),
  'invasion character',
)
A(
  J(buildPokestopDnfFilters({ b8: {} })) ===
    J([{ incident_display_type: [8] }]),
  'invasion display type',
)
A(
  J(buildPokestopDnfFilters({ 'f25-0': {} })) ===
    J([{ contest_pokemon: [{ pokemon_id: 25, form: 0 }] }]),
  'showcase pokemon',
)
A(
  J(buildPokestopDnfFilters({ h3: {} })) === J([{ contest_pokemon_type: [3] }]),
  'showcase type',
)
A(
  J(buildPokestopDnfFilters({ onlyArEligible: true, l1: {} })) ===
    J([{ lure_id: [1] }, { is_ar_scan_eligible: true }]),
  'ar-eligible own clause',
)
A(
  J(buildPokestopDnfFilters({ q1: {}, onlyLevels: '2' })) ===
    J([{ quest_reward_type: [2], quest_reward_item_id: [1] }]),
  'onlyLevels does NOT emit power_up_level (residual — avoids under-return)',
)
// item + candy = TWO separate clauses (must NOT merge — different sub-fields)
const two = buildPokestopDnfFilters({ q1: {}, c25: {} })
A(
  J(two) ===
    J([
      { quest_reward_type: [2], quest_reward_item_id: [1] },
      { quest_reward_type: [4], quest_reward_pokemon: [{ pokemon_id: 25 }] },
    ]),
  'item + candy = two separate clauses (no under-return)',
)
// pokemon-family types merge into one pokemon clause (safe superset)
const pf = buildPokestopDnfFilters({ c25: {}, x50: {} })
A(
  pf.length === 1 &&
    J(pf[0].quest_reward_type) === J([4, 9]) &&
    pf[0].quest_reward_pokemon.length === 2,
  'candy + xl merge into one pokemon-family clause',
)
// mega key is m<pk>-<amount>: the amount must NOT become a form (under-return)
A(
  J(buildPokestopDnfFilters({ 'm150-150': {} })) ===
    J([
      { quest_reward_type: [12], quest_reward_pokemon: [{ pokemon_id: 150 }] },
    ]),
  'mega m<pk>-<amt> -> pokemon id only, NO form (amount residual)',
)
console.log('\nALL PASS')
```

- [ ] **Step 3: Run the golden**

Run: `node pokestop-dnf-golden.js`
Expected: all `ok`, `ALL PASS`.

- [ ] **Step 4: Wire the pokestop mem branch**

In `server/src/models/Pokestop.js`, add imports near the existing fort imports (after `mapScanPokestop`):

```js
const { buildPokestopDnfFilters } = require('../filters/fort/pokestop')
const { describeDnfNarrowing } = require('../filters/fort/describeDnfNarrowing')
```

In the `mem` branch, change the scan body's `filters: []` to the DNF clauses and log before returning. Replace:

```js
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
    .filter((stop) => stop && filterRTree(stop, areaRestrictions, onlyAreas))
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
```

with:

```js
const dnf = buildPokestopDnfFilters(args.filters)
const res = await evalScannerQuery(
  TAGS.pokestops,
  `${mem}/api/pokestop/scan`,
  JSON.stringify({
    min: { latitude: args.minLat, longitude: args.minLon },
    max: { latitude: args.maxLat, longitude: args.maxLon },
    limit: queryLimits.pokestops,
    filters: dnf,
    with_incidents: true,
  }),
  'POST',
  secret,
  httpAuth,
)
if (res && Array.isArray(res.pokestops)) {
  const mapped = res.pokestops
    .map(mapScanPokestop)
    .filter((stop) => stop && filterRTree(stop, areaRestrictions, onlyAreas))
  if (mapped.length > queryLimits.pokestops) {
    mapped.length = queryLimits.pokestops
  }
  const final = this.secondaryFilter(
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
  log.info(
    TAGS.pokestops,
    describeDnfNarrowing(
      'POKESTOP',
      dnf.length,
      res.examined,
      res.pokestops.length,
      final.length,
    ),
  )
  return final
}
```

- [ ] **Step 5: Lint**

Run: `npx eslint server/src/filters/fort/pokestop.js server/src/models/Pokestop.js && npx prettier --check server/src/filters/fort/pokestop.js server/src/models/Pokestop.js`
Expected: clean.

- [ ] **Step 6: Delete golden + commit**

```bash
rm pokestop-dnf-golden.js
git add server/src/filters/fort/pokestop.js server/src/models/Pokestop.js
git commit -m "feat(pokestop): dnf filter backend + narrowing log"
```

---

### Task 4: Station DNF backend + wiring

**Repo/branch:** ReactMap, branch `feat/fort-consumer`. **Depends on Task 1** (`stationed_gmax`).

**Files:**

- Create: `server/src/filters/fort/station.js`
- Modify: `server/src/models/Station.js` (the `mem` branch, ~696-810)

**Interfaces:**

- Consumes: `describeDnfNarrowing` (Task 2); Golbat `stationed_gmax` (Task 1).
- Produces: `buildStationDnfFilters(filters) → object[]` (consumed by `Station.getAll`).

- [ ] **Step 1: Write the station backend**

Create `server/src/filters/fort/station.js`. Mirrors `Station.getAll`'s parsing: `onlyBattleTier !== 'all'`→`battle_level:[tier]`; `j<lvl>` keys (when `onlyBattleTier === 'all'`)→`battle_level:[lvls]`; bare `<id>-<form>` (battle combo)→`battle_pokemon` (gender residual); `onlyGmaxStationed`→`stationed_gmax:true`. `onlyAllStations` or `onlyInactiveStations` ⇒ match-all (the active/inactive gate is a now-relative residual, and inactive-mode must return all inactive stations). `onlyMaxBattles` with no expressible battle condition ⇒ match-all (can't express "has any active battle").

```js
// @ts-check

/**
 * Translate a station's `args.filters` into ApiFortDnfFilter[] clauses.
 * DNF is a superset narrow; the station JS gate (passesTimeGate/
 * passesFilterGate) finalizes. Active/inactive and upcoming are now-relative
 * time windows and stay residual. Returns [] (match-all) when a match-all
 * toggle is active or a battle intent can't be expressed.
 *
 * @param {Record<string, any>} filters args.filters
 * @returns {object[]}
 */
function buildStationDnfFilters(filters) {
  if (!filters || typeof filters !== 'object') return []
  const {
    onlyAllStations,
    onlyInactiveStations,
    onlyMaxBattles,
    onlyBattleTier,
    onlyGmaxStationed,
  } = filters
  // Now-relative / show-everything gates -> can't narrow server-side.
  if (onlyAllStations || onlyInactiveStations) return []

  const clauses = []

  if (onlyMaxBattles) {
    const battleLevels = []
    const battlePokemon = []
    if (onlyBattleTier && onlyBattleTier !== 'all') {
      const t = Number(onlyBattleTier)
      if (Number.isFinite(t)) battleLevels.push(t)
    } else {
      // per-level multi-select + battle-combo keys
      Object.entries(filters).forEach(([key, value]) => {
        if (typeof key !== 'string' || key.length === 0) return
        if (key.startsWith('j')) {
          const lvl = Number(key.slice(1))
          if (Number.isFinite(lvl)) battleLevels.push(lvl)
        } else if (/^\d/.test(key)) {
          const [idPart, formPart] = key.split('-', 2)
          const id = Number(idPart)
          if (!Number.isFinite(id)) return
          const pair = { pokemon_id: id }
          if (
            formPart &&
            formPart !== 'null' &&
            Number.isFinite(Number(formPart))
          )
            pair.form = Number(formPart)
          battlePokemon.push(pair)
        }
      })
    }
    if (battleLevels.length || battlePokemon.length) {
      // Separate OR clauses: the real filter's level-vs-pokemon AND/OR is
      // unverified, so separate clauses are a safe superset either way
      // (secondaryFilter's matchesStationBattleFilter narrows exactly).
      if (battleLevels.length) clauses.push({ battle_level: battleLevels })
      if (battlePokemon.length) clauses.push({ battle_pokemon: battlePokemon })
    } else {
      // onlyMaxBattles but no expressible battle condition = "any active
      // battle" — DNF can't say that, so match-all and let the JS gate narrow.
      return []
    }
  }

  if (onlyGmaxStationed) clauses.push({ stationed_gmax: true })

  return clauses.length ? clauses : []
}

module.exports = { buildStationDnfFilters }
```

- [ ] **Step 2: Golden-check the station backend**

Create `station-dnf-golden.js` (throwaway):

```js
const { buildStationDnfFilters } = require('./server/src/filters/fort/station')
const A = (c, m) => {
  if (!c) throw new Error('FAIL ' + m)
  console.log('ok ' + m)
}
const J = (o) => JSON.stringify(o)

A(
  J(buildStationDnfFilters({ onlyAllStations: true })) === '[]',
  'onlyAllStations -> match-all',
)
A(
  J(
    buildStationDnfFilters({
      onlyInactiveStations: true,
      onlyGmaxStationed: true,
    }),
  ) === '[]',
  'onlyInactiveStations poisons (time residual)',
)
A(
  J(buildStationDnfFilters({ onlyMaxBattles: true, onlyBattleTier: '5' })) ===
    J([{ battle_level: [5] }]),
  'single tier -> battle_level',
)
A(
  J(
    buildStationDnfFilters({
      onlyMaxBattles: true,
      onlyBattleTier: 'all',
      j5: {},
      j6: {},
    }),
  ) === J([{ battle_level: [5, 6] }]),
  'multi tier -> battle_level list',
)
A(
  J(
    buildStationDnfFilters({
      onlyMaxBattles: true,
      onlyBattleTier: 'all',
      '150-0': {},
    }),
  ) === J([{ battle_pokemon: [{ pokemon_id: 150, form: 0 }] }]),
  'combo -> battle_pokemon',
)
A(
  J(
    buildStationDnfFilters({
      onlyMaxBattles: true,
      onlyBattleTier: 'all',
      j5: {},
      '150-0': {},
    }),
  ) ===
    J([
      { battle_level: [5] },
      { battle_pokemon: [{ pokemon_id: 150, form: 0 }] },
    ]),
  'level + pokemon = separate OR clauses',
)
A(
  J(buildStationDnfFilters({ onlyGmaxStationed: true })) ===
    J([{ stationed_gmax: true }]),
  'gmax -> stationed_gmax',
)
A(
  J(
    buildStationDnfFilters({
      onlyMaxBattles: true,
      onlyBattleTier: '5',
      onlyGmaxStationed: true,
    }),
  ) === J([{ battle_level: [5] }, { stationed_gmax: true }]),
  'battle OR gmax = two clauses',
)
A(
  J(buildStationDnfFilters({ onlyMaxBattles: true, onlyBattleTier: 'all' })) ===
    '[]',
  'onlyMaxBattles with no condition -> match-all',
)
console.log('\nALL PASS')
```

- [ ] **Step 3: Run the golden**

Run: `node station-dnf-golden.js`
Expected: all `ok`, `ALL PASS`.

- [ ] **Step 4: Wire the station mem branch**

In `server/src/models/Station.js`, add imports near the existing fort imports:

```js
const { buildStationDnfFilters } = require('../filters/fort/station')
const { describeDnfNarrowing } = require('../filters/fort/describeDnfNarrowing')
```

In the `mem` branch, change `filters: []` to `filters: dnf` (compute `dnf` just before the `evalScannerQuery` call) and add the narrowing log just before `return stations`:

```js
const dnf = buildStationDnfFilters(args.filters)
const res = await evalScannerQuery(
  TAGS.stations,
  `${mem}/api/station/scan`,
  JSON.stringify({
    min: { latitude: args.minLat, longitude: args.minLon },
    max: { latitude: args.maxLat, longitude: args.maxLon },
    limit: queryLimits.stations,
    filters: dnf,
  }),
  'POST',
  secret,
  httpAuth,
)
```

and change the existing `return stations` (end of the `if (res && Array.isArray(res.stations))` block) to:

```js
log.info(
  TAGS.stations,
  describeDnfNarrowing(
    'STATION',
    dnf.length,
    res.examined,
    res.stations.length,
    stations.length,
  ),
)
return stations
```

(Everything between — the `passesFilterGate`/`passesTimeGate`/`.map` residual — is unchanged.)

- [ ] **Step 5: Lint**

Run: `npx eslint server/src/filters/fort/station.js server/src/models/Station.js && npx prettier --check server/src/filters/fort/station.js server/src/models/Station.js`
Expected: clean.

- [ ] **Step 6: Delete golden + commit**

```bash
rm station-dnf-golden.js
git add server/src/filters/fort/station.js server/src/models/Station.js
git commit -m "feat(station): dnf filter backend + narrowing log"
```

**Acceptance gate (deferred, user runs live vs a Golbat deployed at Task-1 HEAD, dual sources):** the **live parity gate** — for a viewport + representative filters, the DNF result after `secondaryFilter` must **equal** the match-all result (same markers). Exercise: a rare quest reward, a raid boss, an invasion type, a battle pokemon/tier, `onlyGmaxStationed`, and a poisoning case (a specific filter + a match-all toggle, and `onlyInactiveStations`). Watch the DNF log — a large "−N by secondaryFilter" on a case you expected to narrow is a gap to investigate; a divergence in marker set is a DNF **under-return** bug.

---

## Self-Review

**Spec coverage** (`2026-07-16-fort-dnf-filtering-design.md`):

- Three pure backends under `server/src/filters/fort/` (§4) → Tasks 2-4. ✅
- Wired into the existing mem branches, `secondaryFilter` untouched (§3) → Tasks 2-4. ✅
- Poisoning rule (§3.1) → each backend returns `[]` on match-all toggles / gaps; golden-tested. ✅
- Per-type translation (§4.1) → the three backends. ✅
- Golbat `stationed_gmax` only (§5) → Task 1; `is_inactive` deliberately NOT filled (station backend poisons on `onlyInactiveStations`). ✅
- Observability log (§6) → `describeDnfNarrowing`, used in all three branches. ✅
- Residual stays JS (§3, §8): quest title/target, gender, ex/in-battle, invasion-confirmed, station time-windows — none emitted as clauses. ✅
- Live parity gate (§7) → Task 4 acceptance. ✅

**Placeholder scan:** every code step has complete code; no TBD. ✅

**Type consistency:** `build{Gym,Pokestop,Station}DnfFilters(filters)` and `describeDnfNarrowing(label, clauses, examined, returned, final)` are consistent across their definition (Tasks 2-4) and the model wiring. Clause field names match `ApiFortDnfFilter` json tags (`quest_reward_type`, `quest_reward_item_id`, `quest_reward_pokemon`, `lure_id`, `incident_character`, `incident_display_type`, `incident_pokemon`, `contest_pokemon`, `contest_pokemon_type`, `team_id`, `available_slots`, `raid_level`, `raid_pokemon_id`, `battle_level`, `battle_pokemon`, `is_ar_scan_eligible`, `stationed_gmax`). ✅ (Gym's raid boss uses `raid_pokemon_id`, not `raid_pokemon` — a wrong key is silently ignored by Golbat.)

**Superset-invariant spot checks:** gym raid-boss drops gender (residual) — superset ✓; pokestop splits quest reward families into separate OR clauses (item / pokemon-family / type-only) so no clause ANDs incompatible sub-fields, and drops title/target + exact amounts to the residual — superset, no under-return ✓; station emits battle_level and battle_pokemon as separate OR clauses (safe regardless of the real AND/OR) and drops upcoming/active-inactive — superset ✓; every "can't express" path returns `[]` (match-all), never a narrowing clause — no under-return. ✅ The one hard failure mode (a single clause ANDing sub-fields a real quest can't jointly satisfy) is explicitly avoided and golden-tested (`item + candy = two clauses`). ✅
