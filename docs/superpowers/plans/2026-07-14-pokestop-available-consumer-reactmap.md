# ReactMap consumer for Golbat `GET /api/pokestop/available` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a scanner source is a Golbat endpoint, have `Pokestop.getAvailable()` fetch `GET {mem}/api/pokestop/available` and map the structured tuples to the SAME `{ available: string[], conditions }` output it produces from SQL today — with SQL as the fallback (no `mem`, or endpoint failure/503). Mirrors the existing `Pokemon.getAvailable` path.

**Architecture:** A pure mapper `mapAvailablePokestops(apiResponse, ctx)` reproduces the exact filter-key formulas of the SQL path; `Pokestop.getAvailable` gains a `mem` branch that calls the endpoint, detects failure, and falls back to the existing SQL block. The ~30-query SQL block is unchanged and becomes the fallback + the MAD path.

**Tech Stack:** Node, Objection/Knex, the existing `evalQuery`/`fetchJson` HTTP helpers, Jest/vitest (match the repo's test runner).

## Global Constraints

- Branch `feat/pokestop-available-consumer` off `develop`.
- **The API-derived keys MUST byte-for-byte equal the SQL-derived keys.** A golden comparison is the acceptance gate for the mapper.
- MAD sources always have `mem: ''` → always SQL; gate the endpoint path strictly on `if (mem)` (truthy URL), exactly like `Pokemon.getAvailable` (`Pokemon.js:874`).
- `count` in the tuples is NOT used for pokestops (presence only) — unlike Pokémon rarity.
- Special cases stay in ReactMap (they already do): GoFest-2026-Mewtwo type-20 fallback (`Pokestop.js:22-33,1494-1519`), temp-evo type-20 in `parseRdmRewards` (`:1945-1962`). The mapper must reproduce the GoFest key (`m150-150`) — see Task 2.
- Golbat response (draft wire format):
  ```
  { quests:[{with_ar,reward_type,item_id,amount,pokemon_id,form_id,title,target,count}],
    invasions:[{character,display_type,confirmed,slot1_pokemon_id,slot1_form,count}],
    lures:[{lure_id,count}], showcases:[{pokemon_id,form,type_id,count}] }
  ```
- Design reference: Golbat repo `docs/superpowers/specs/2026-07-14-pokestop-available-api-design.md` (§5 tuple contract).

## File Structure

- `packages/types/lib/server.d.ts` (modify) — add `AvailablePokestops` (+ per-category) types; add `httpAuth` to `DbContext`.
- `server/src/models/pokestopAvailableMapper.js` (create) — the pure mapper + its unit tests' target.
- `server/src/models/Pokestop.js` (modify) — `getAvailable`: destructure `mem/secret/httpAuth`, endpoint branch + failure→SQL fallback, call the mapper.
- Test files alongside (match repo convention — check for existing `*.test.js`/`__tests__`).

---

### Task 1: Response types + `DbContext.httpAuth`

**Files:**

- Modify: `packages/types/lib/server.d.ts` (`AvailablePokemon` at ~65; `DbContext` at ~29-55)

**Interfaces:**

- Produces: `AvailablePokestops` and its member types; `DbContext.httpAuth?`.

- [ ] **Step 1: Add the types** next to `AvailablePokemon`:

```ts
export interface AvailablePokestopQuest {
  with_ar: boolean
  reward_type: number
  item_id: number
  amount: number
  pokemon_id: number
  form_id: number
  title: string
  target: number
  count: number
}
export interface AvailablePokestopInvasion {
  character: number
  display_type: number
  confirmed: boolean
  slot1_pokemon_id: number
  slot1_form: number
  count: number
}
export interface AvailablePokestopLure {
  lure_id: number
  count: number
}
export interface AvailablePokestopShowcase {
  pokemon_id: number
  form: number
  type_id: number
  count: number
}
export interface AvailablePokestops {
  quests: AvailablePokestopQuest[]
  invasions: AvailablePokestopInvasion[]
  lures: AvailablePokestopLure[]
  showcases: AvailablePokestopShowcase[]
}
```

- [ ] **Step 2: Add `httpAuth` to `DbContext`** (it's set at `DbManager.js:272` but missing from the interface): `httpAuth?: { username: string; password: string } | null` (match the actual shape used by `evalQuery`/`fetchJson` — verify the real fields).

- [ ] **Step 3: Typecheck + commit**

Run the repo's type check (e.g. `yarn tsc --noEmit` / the packages/types build). Then:

```bash
git add packages/types/lib/server.d.ts
git commit -m "types: add AvailablePokestops + DbContext.httpAuth"
```

---

### Task 2: The pure mapper `mapAvailablePokestops` (the crux)

**Files:**

- Create: `server/src/models/pokestopAvailableMapper.js`
- Test: `server/src/models/pokestopAvailableMapper.test.js` (match repo test convention)

**Interfaces:**

- Produces: `mapAvailablePokestops(api: AvailablePokestops, ctx: { invasions: Record<number, {firstReward?:boolean,secondReward?:boolean,thirdReward?:boolean}> }): { available: string[], conditions: Record<string, Record<string,{title:number|string,target:number}>> }`
- `ctx.invasions` = the event invasion config used by the SQL rocket branch (`state.event.invasions`), needed to gate `a` keys.

**Key formulas to reproduce EXACTLY** (from `Pokestop.js:1763-1932`; conditions via `process()` only for quest keys when `title` is truthy):

| tuple                      | rule → key                                                                                                                                            |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| quest reward_type 1        | `p${amount}`                                                                                                                                          |
| 2                          | `q${item_id}`                                                                                                                                         |
| 3                          | `d${amount}`                                                                                                                                          |
| 4                          | `c${pokemon_id}`                                                                                                                                      |
| 7                          | `form_id===0 ? \`${pokemon_id}\` : \`${pokemon_id}-${form_id}\`` (see §form)                                                                          |
| 9                          | `x${pokemon_id}`                                                                                                                                      |
| 12                         | `m${pokemon_id}-${amount}`                                                                                                                            |
| 20 (GoFest/temp-evo)       | if `pokemon_id`>0 → `m${pokemon_id}-${amount}`; else `u20` (see §type20)                                                                              |
| other                      | `u${reward_type}`                                                                                                                                     |
| invasion, `character`>0    | `i${character}`                                                                                                                                       |
| invasion, `character`===0  | `b${display_type}`                                                                                                                                    |
| invasion confirmed         | + `a${slot1_pokemon_id}-${slot1_form}` when `confirmed`, `slot1_pokemon_id`>0, `ctx.invasions[character]?.firstReward`, and `character` NOT in 41..44 |
| lure                       | `l${lure_id}`                                                                                                                                         |
| showcase, `pokemon_id`>0   | `f${pokemon_id}-${form ?? 0}`                                                                                                                         |
| showcase, else `type_id`>0 | `h${type_id}`                                                                                                                                         |

**§form (top risk):** for reward_type 7, the SQL emits bare `${pokemon_id}` when RDM `form_id` was JSON-absent and `${pokemon_id}-${form}` when present (incl. 0). The endpoint always sends `form_id` as a number (0 for absent). Normalize **`form_id === 0` → bare key**; nonzero → `${pokemon_id}-${form_id}`. Document that a genuine explicit-form-0 pokémon reward (rare) would diverge; the golden test (Step 6) validates against real data.

**§type20:** the SQL GoFest fallback emits `m150-150` and excludes empty-info type-20 rows from `u`-types. The endpoint conveys type-20 as a quest tuple. Emit `m${pokemon_id}-${amount}` when `pokemon_id`>0 (covers GoFest 150-150 and temp-evo mega energy); else `u20`. Flag for the golden test.

**conditions:** for every QUEST key produced, if the tuple's `title` is truthy, add `conditions[key][\`${title}-${target}\`] = { title, target }`. Invasions/lures/showcases contribute nothing to conditions. Process BOTH `with_ar`true and false tuples into the same`available`Set +`conditions` (keys dedupe via the Set, exactly as the SQL merges quest + alternative_quest).

- [ ] **Step 1: Write failing unit tests** — one assertion per key type + the edge cases. Cover: each reward_type→key; form_id 0 → bare `<id>`, form_id 3 → `<id>-3`; type 20 with pokemon_id 150 → `m150-150`; an unhandled reward_type (e.g. 8) → `u8`; invasion character 1 → `i1`, character 0 dt9 → `b9`; confirmed character 1 slot1 25 with `ctx.invasions[1].firstReward` → `a25-0`, and character 41 → NO `a` key; lure → `l501`; showcase pokemon → `f1-0`, showcase type-only → `h5`; conditions built for a quest with title/target and NOT for a lure. Assert `available` is a de-duplicated array and `conditions` shape matches.

```js
// illustrative — expand to cover the whole table above
const { mapAvailablePokestops } = require('./pokestopAvailableMapper')
test('pokemon reward form normalization', () => {
  const { available } = mapAvailablePokestops(
    {
      quests: [
        {
          with_ar: false,
          reward_type: 7,
          pokemon_id: 150,
          form_id: 0,
          item_id: 0,
          amount: 0,
          title: '',
          target: 0,
          count: 1,
        },
        {
          with_ar: false,
          reward_type: 7,
          pokemon_id: 151,
          form_id: 3,
          item_id: 0,
          amount: 0,
          title: '',
          target: 0,
          count: 1,
        },
      ],
      invasions: [],
      lures: [],
      showcases: [],
    },
    { invasions: {} },
  )
  expect(available).toContain('150') // form_id 0 -> bare
  expect(available).toContain('151-3')
  expect(available).not.toContain('150-0')
})
```

- [ ] **Step 2: Run → fail.** `<repo test cmd> pokestopAvailableMapper` — FAIL (module missing).

- [ ] **Step 3: Implement `mapAvailablePokestops`** per the table + §form + §type20 + conditions rules. Use a `Set` for `available`; a `process(key, title, target)` helper mirroring `Pokestop.js:1285-1294`. Return `{ available: [...set], conditions }`.

- [ ] **Step 4: Run → pass.** All mapper unit tests green.

- [ ] **Step 5: Self-review** the key table against `Pokestop.js:1763-1932` line by line — especially the `i` vs `b` split, the `a`-key gating (event config + 41-44 skip), and showcase `f` vs `h`.

- [ ] **Step 6: Golden comparison test (acceptance gate).** Build a representative dataset and assert the mapper output equals the SQL `getAvailable` output for the equivalent data. If a live equivalent isn't scriptable in a unit test, at minimum add a fixture-based test that feeds the SQL path (via a seeded test DB or a hand-built `{available,conditions}` expectation derived from the same rewards) and diff. Record any key that diverges (esp. form and type-20) as a finding for the controller.

- [ ] **Step 7: Commit**

```bash
git add server/src/models/pokestopAvailableMapper.js server/src/models/pokestopAvailableMapper.test.js
git commit -m "feat(pokestop): map Golbat /api/pokestop/available tuples to filter keys"
```

---

### Task 3: Wire `Pokestop.getAvailable` — endpoint branch + SQL fallback

**Files:**

- Modify: `server/src/models/Pokestop.js` (`getAvailable` 1253-1938; import the mapper)
- Test: `server/src/models/Pokestop.getAvailable.test.js` (fallback behavior)

**Interfaces:**

- Consumes: `mapAvailablePokestops` (Task 2), `evalQuery` (`Pokemon.js`/shared), `AvailablePokestops` (Task 1).

- [ ] **Step 1: Write failing tests** for the branch logic (mock `evalQuery`):

  - `mem` set + endpoint returns a valid `AvailablePokestops` object → returns the mapper's `{available, conditions}` (endpoint path taken, SQL not run).
  - `mem` set + endpoint returns a non-array/`Response`-like object (503) OR throws → falls back to the SQL path and returns its `{available, conditions}`.
  - `mem` falsy → SQL path (unchanged).

- [ ] **Step 2: Run → fail.**

- [ ] **Step 3: Implement.** Add `mem, secret, httpAuth` to the destructure (`Pokestop.js:1253`). At the top of the method:

```js
if (mem) {
  try {
    const res = await this.evalQuery(`${mem}/api/pokestop/available`, undefined, 'GET', secret, httpAuth)
    // fetchJson returns a Response object (not an array/object with `quests`) on 503/non-200
    if (res && Array.isArray(res.quests) && Array.isArray(res.invasions)) {
      return mapAvailablePokestops(res, { invasions: state.event.invasions })
    }
    // else fall through to SQL fallback below
    log.warn(...) // endpoint unavailable (e.g. FortInMemory off) — falling back to SQL
  } catch (e) {
    log.warn(...) // endpoint error — falling back to SQL
  }
}
// ...existing SQL block runs unchanged as the fallback / MAD / no-mem path...
```

Verify the exact validity check against the real `fetchJson` failure shape (a `Response` object has no `.quests`), and the correct `state`/`log`/`evalQuery` accessors on the Pokestop model. Keep the entire existing SQL block intact as the fallback.

- [ ] **Step 4: Run → pass** (all three branch tests + Task 2 mapper tests still green).

- [ ] **Step 5: Self-review** — the failure detection must catch BOTH the 503 Response-object case and thrown errors; MAD (`mem:''`) must never enter the branch.

- [ ] **Step 6: Commit**

```bash
git add server/src/models/Pokestop.js server/src/models/Pokestop.getAvailable.test.js
git commit -m "feat(pokestop): consume /api/pokestop/available with SQL fallback"
```

---

## Self-Review

- **Spec coverage:** types (T1) · exact key mapping incl. form/type20/conditions (T2) · endpoint branch + 503/no-mem SQL fallback + MAD-stays-SQL (T3). Golden comparison = acceptance gate (T2 Step 6).
- **Top risks flagged inline:** §form (`form_id 0 → bare`), §type20 (`m150-150` vs `u20`), 503 detection (Response object, not array). All have explicit resolutions + the golden test.
- **Placeholder scan:** the golden test (T2 S6) depends on the repo's testability of the SQL path — the implementer must adapt to the real test harness; if a true golden diff isn't feasible, the fixture-based expectation is the floor.

## Follow-up

Phase 2 (out of scope): move pokestop map-data (`getPokestops`) to Golbat once the scan response carries incidents; then the `adv` title/target filtering can move server-side too. If the golden test shows the §form or §type20 divergence is real, the cleaner fix moves to Golbat (convey null form / a GoFest sentinel) — coordinate via PR #383.
