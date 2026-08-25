# ReactMap 2.0: filters

**Depends on:** the rules model (`2026-08-24-reactmap-2-0-rules-model-design.md`), the seven answers in
`2026-08-25-decisions.md`, and the completed transport plan.
**Blocks:** the remaining rule categories, the profile switcher, and Alerts.

## Scope

The Pokémon half of the filters feature, end to end: tables, RPC, the filters page, the species
picker, the condition editor, and the marker popup that explains an entity's appearance.

Pokémon only, deliberately. The five rule categories share a sentence grammar and almost nothing
else, and this plan is meant to put the model in front of testers on the hardest category with every
piece the other four will reuse already proven. Gym, pokestop, station and nest are the next plan.

Two consequences worth stating rather than discovering. Decision 2 of the decisions document, that
Mega raids and showcase contests are filterable, lands in **that** plan and not this one, because a
Mega raid is a gym condition and a showcase is a pokestop one. Decision 3, the numeric size range,
is a Pokémon column and ships here.

## What this amends in the rules model

The rules model is approved and is not reopened. Four things moved under it, each traceable to a
decision taken after it was written.

**Rules have an order, and it resolves nothing.** The rules model says ordering is "not built, and
not expected to return". That objection was to ordering *deciding* anything, and it stands: each
display property still resolves independently. What is added is that the list renders in a stable
order rather than an arbitrary one. There is no `position` column and no drag handle; a group sorts
by the lowest `rule.id` it contains. Making the order user-editable later is a migration, and a
cheap one, but drag handles are the affordance that suggests the top rule wins, which is the belief
this whole model exists to remove.

**`xxs` and `xxl` become `size_min` and `size_max`.** Two booleans cannot express a middle range and
round-trip cleanly to neither upstream. Golbat takes a size min and max; Poracle takes `size` and
`max_size` from 1 for XXS to 5 for XXL.

**Three PvP league pairs become one league and one rank range.** Reasoning in its own section below.

**`profile` gains `rules_version`.** One integer, bumped on any rule write, so an open map can notice
its cached rules went stale.

## PvP: one league per rule

The rules model gives `rule_pokemon` a `little_min`/`little_max`, `great_min`/`great_max` and
`ultra_min`/`ultra_max`. That is replaced by:

```sql
pvp_league                     -- NULL | 500 | 1500 | 2500, the CP cap as its own value
pvp_rank_min, pvp_rank_max
```

Three reasons, in increasing order of importance.

**It round-trips.** PoracleNG stores one `pvp_ranking_league` per tracking row
(`processor/internal/db/migrations/000001_initial_schema.up.sql:66`), and that column routes the row
into exactly one bucket at index time (`processor/internal/db/monsters.go:73-84`): zero means the row
is evaluated against every Pokémon on the IV path, non-zero means it is only ever reached when the
Pokémon actually ranks in that league. One league per row, Great or Ultra, never both. A ReactMap
rule carrying two leagues could not become one Poracle row.

**Three pairs on one row AND together, which is not what anyone means.** "Great rank 1-100 and Ultra
rank 1-100" requires a Pokémon to rank well in both leagues at once. What people want is "good in
Great *or* good in Ultra", and that is two rules under any schema.

**A rule holding three leagues is a set, and the model's central decision is that a rule never holds
one.** Singular rows are what the entire schema turns on. Three league pairs were the one place the
approved model quietly contradicted itself.

Two rules differing only in league do not group, because league is not the identifying column, so
they render as two cards named whatever the user called them. That reads correctly.

**What is *not* mirrored, because it turned out not to exist.** IV and PvP conditions are not
mutually exclusive in Poracle. `matchMonsters` applies the IV, CP and level checks outside the
`if league != 0` block (`processor/internal/matching/pokemon.go`), so a PvP row honours its IV bounds
too, as an AND. Nothing validates against the combination, which is meaningful given Poracle declares
mutual exclusivity explicitly where it exists (`v2_lure.go:29-30`). What makes a PvP row *feel* like
a mode is that its IV columns sit at their wildcards, not that anything forbids them. ReactMap keeps
IV and PvP conditions combinable on one rule.

## Schema

```sql
rule
  id, user_id, profile_id
  category            -- 'pokemon' throughout this plan
  name
  size, glow, notify

rule_pokemon
  rule_id
  species_id, form_id            -- NULL means any
  pvp_target_species             -- NULL means any evolution
  iv_min, iv_max
  atk_min, atk_max,  def_min, def_max,  sta_min, sta_max
  level_min, level_max
  cp_min, cp_max
  gender
  size_min, size_max             -- 1 = XXS .. 5 = XXL
  pvp_league                     -- NULL | 500 | 1500 | 2500
  pvp_rank_min, pvp_rank_max

rule_exclusion
  rule_id, species_id, form_id   -- form_id NULL means any form

profile
  id, user_id, system, name
  areas, location, preferences
  rules_version
```

Index `(user_id, profile_id)` on `rule`. Anything further waits for a real query shape.

### Grouping

Two rules group when every column matches except `species_id` and `form_id`: that is `name`, `size`,
`glow` and `notify` from `rule`, and every condition from `rule_pokemon`. "Rare spawns on 25 species"
is 25 `rule` rows and 25 `rule_pokemon` rows rendered as one card. Changing one species' size makes
it stop matching its siblings, so it leaves the group by itself; nothing implements ungrouping.

A rule's `rule_exclusion` rows participate in the grouping key: two rules with different exclusions
are different rules and do not group. In practice exclusions and grouping never collide, because
exclusions are only valid on a rule whose `species_id` is `NULL` and the picker writes exactly one
row for "any". Two identical any-species rules would be duplicates rather than a group, which the
editor should refuse. Worth a check constraint on the invariant, and the exclusion control does not
render on a rule that names a species.

### Profiles

One profile per user, seeded, `system: true`. The switcher, and the `areas` and `location` columns it
would edit, are **deferred to a later plan**. The columns exist now so that plan needs no migration.

## Seeding

On **first login**, not account creation. The auth backfill writes `auth_user` rows for existing 1.x
accounts directly, so those users never pass through creation; a creation-only hook would seed
everyone except the people migrating from 1.x, who are exactly the ones who would report an empty
map. Idempotent, guarded on the absence of a profile.

```
profile        system: true, name 'Default', rules_version 0
rule           name 'Everything', category 'pokemon', size/glow/notify NULL
rule_pokemon   rule_id, every other column NULL
```

This matters because of the model's own rule: **any matching rule makes an entity visible, and
adding a rule can only ever add visibility.** Zero rules is therefore a blank map, and with no
migration from 1.x every user starts at zero. "Everything" is the simplest true instance of the
model rather than a special case: no conditions, no treatment, matches everything. A new map looks
like 1.x on open, and deleting that one card empties the map, which is the lesson.

Signed-out users on an open instance have no profile and no rules. The server uses an implicit
match-everything set for them; they see the map and cannot edit filters.

## The wire

### Subscribe stops carrying filters

Task 1 of the transport plan had the client send Golbat DNF clauses directly, because rules did not
exist yet. They do now, the session identifies the user, and there is one profile.

```jsonc
// before
{ "type": "subscribe", "category": "pokemon", "viewport": {...}, "filters": [ /* DNF */ ] }

// after
{ "type": "subscribe", "category": "pokemon", "viewport": {...} }
```

The server resolves user to profile to rules, runs the existing `rules-to-golbat-filters` translation
and the existing `rule-local-filter` matcher. Filters become server-authoritative rather than
client-asserted, and the message shrinks.

### The delta gains two fields

```jsonc
{ "type": "delta", "category": "pokemon", "rulesVersion": 41,
  "added": [ { "id": "a1b2c3", "pokemon_id": 147, "iv": 100, "matched": [7, 12, 88] } ],
  "changed": [], "removed": [] }
```

`matched` is the ids of the rules that matched that entity. `rulesVersion` is one integer on the
envelope, not per entity.

Matched ids rather than resolved display properties, because the client has to resolve appearance for
every visible entity continuously and the popup then costs nothing extra. Resolved properties are
larger on the wire and have thrown away *which rule*, so the popup would need them sent as well.
Measured on a three-rule match: `"matched":[7,12,88]` is about 19 bytes against about 62 for
`"size":"xl","rings":[...],"notify":true`.

## Client state

Rules are RPC and land in TanStack Query. Entities are deltas and land in the Zustand store. Nothing
crosses.

```ts
trpc.rules.list.useQuery({ profileId })   // Map<number, Rule>
useEntityStore()                          // normalized entities
resolveAppearance(entity.matched, rules)  // at render, in the drawing component
```

The query key includes `profileId` or profile switching will serve the wrong list from cache when
that plan lands.

### Resolution

The only new *evaluation* logic on the client -- grouping derivation and sentence rendering are new
too, but they read rules rather than deciding what matched. Every line of this is a resolution rule
the rules model already fixed.

```ts
function resolveAppearance(matched: number[], rules: Map<number, Rule>) {
  const hit = matched.map((id) => rules.get(id)).filter(Boolean)
  return {
    size: hit.reduce((biggest, r) => maxSize(biggest, r.size), 'md'),
    rings: hit.map((r) => r.glow).filter(Boolean),
    notify: hit.some((r) => r.notify),
  }
}
```

Deciding whether a Pokémon satisfies an IV range or a PvP rank never leaves the server, so there is
one matcher and it cannot drift from what produced the display.

### Staleness

Two triggers, one path.

- A `matched` id the client does not hold means a rule was added elsewhere.
- A `rulesVersion` that differs from the one the rules were fetched with means a rule was edited
  elsewhere. The unknown-id check alone cannot see this, because an edit keeps its id.

Both do the same thing: refetch rules, then resubscribe the open categories. Resubscribing reuses
`updateSubscription`, which already updates an open category in place rather than starting a second
poll loop. A user's own edit takes the identical path, so there is one code path for "the rules
changed" regardless of which device changed them.

A rule edit therefore costs a refetch and a fresh Golbat scan, and the map visibly reloads rather
than updating in place. That is correct: the edit genuinely changes which entities belong in the
viewport, and anything smoother would mean the client guessing at server-side matching.

## The interface

### The page

Tab bar with Filters active and Alerts present but disabled, carrying its own accent so the disabled
state reads as "not yet" rather than "broken". Alerts is a later plan, but the tab structure is a
decision this plan makes either way, and the client shape spec's reason for tabs — that a toggle is
the thing most likely to make someone edit the wrong list — only teaches anything if it is there
before the second system arrives.

```
┌ Filters ─┬ Alerts ─┐                             [+ New filter]
│  violet  │ (dimmed)│
└──────────┴─────────┘

Everything                                          Any Pokémon
shown normally

Hundos                                              Any Pokémon
IV 100% · extra large · gold ring · notifies

Great League                                        Any Pokémon
Great rank 1–100 · blue ring

Rare spawns                                         24 Pokémon
large

Rare spawns                                         Larvitar
extra large
```

### The card

A name, a subject, and a sentence. The subject sits beside the name rather than inside the sentence,
which is what keeps a 25-species group readable and what distinguishes two cards that share a name
after a split. It renders three ways:

- `Any Pokémon` when `species_id` is `NULL`
- the species name when the group is one row
- a count when the group is more than one

Naming a single species beats "1 Pokémon", which would make someone open the card to find out which.
Moving the subject out of the sentence also means the sentence never has to render a large group,
which was the part that got ugly.

Cards sort by the lowest `rule.id` in the group.

### The empty state

Reachable only by deleting everything, since the seed means nobody starts there.

```
Nothing is showing on your map.

A filter is what makes Pokémon appear. Start with one of these,
or build your own.

  [ Everything ]  [ 100% IV ]  [ Great League ]  [ Rare spawns ]
```

Each creates a real editable rule rather than a preset, so tapping "Great League" leaves a card that
can be opened and changed.

### Editing

A sheet over the map, so markers respond while the rule is tuned. Every underlined span opens a
control.

```
Show  25 Pokémon  with  IV 100%  as  extra large  ·  gold ring  ·  notify me
      └ picker ┘       └ cond ┘     └───── appearance ─────┘
```

**The picker** is 1.x's `react-virtuoso` grid restyled: one tile per species showing default form
art, an affordance on species that have forms, search matching form names so "alolan" surfaces every
Alolan form at once, and a select-all-shown action. That pairing is what makes "hundos for these 25
species" a search and two taps rather than 25 enable-and-customise cycles.

**Conditions AND together**, with `+` to add another. The full Pokémon set ships: IV, individual
attack, defence and stamina, level, CP, gender, size range, and one PvP league with a rank range. The
PvP widening rule is already implemented in `rules-to-golbat-filters` and is not re-derived here.

**Exclusions** are a control on the picker, rendered only when the subject is Any Pokémon. Reads as
"any Pokémon except Magikarp".

**The split warning** is the one piece of interface the storage model makes mandatory. Before a
condition change commits on a grouped card:

```
This will separate Larvitar from the other 24.
                                    [ Cancel ]  [ Separate ]
```

### The marker popup

Named from the ids already on the wire, so it costs nothing beyond the lookup.

```
Extra large because Hundos matched.
Gold ring from Hundos.
Blue ring from Great League.
Notifying, because Hundos asks to.
```

This is what replaces first-match-wins as the answer to "why is this one big". It names the rules
rather than describing a procedure, and it is the reason ordering does not need to resolve anything.

## Errors

- A failed rule mutation rolls back optimistically and says so. The map keeps rendering against the
  rules it has rather than blanking.
- A failed rules refetch leaves the last good set in place. A slightly stale map beats an empty one.
- An entity carrying a `matched` id that still does not resolve after a refetch renders at default
  appearance rather than throwing.
- A rule write that fails to bump `rules_version` is a correctness bug, not a cosmetic one: other
  devices would never notice the edit. The bump belongs in the same transaction as the write.

## Acceptance criteria

Written first and failing, as the merge gate. The two plans that used this discipline produced no
defect that survived its task; the plan before them produced twenty-seven.

1. A user's first login seeds a profile and an "Everything" rule, and their map shows Pokémon.
2. Deleting the only rule empties the map.
3. Selecting 25 species in one pass writes 25 rows and renders one card.
4. Changing one species' size warns before committing, then produces two cards sharing a name and
   distinguished by their subjects.
5. A Pokémon matching two rules gets the larger size and both ring segments.
6. Tapping a marker names every rule that matched it.
7. A rule edited in another session reaches an open map without a reload.
8. The exclusion control is absent on a rule that names a species.

Criterion 7 is the one that needs a second connection to test honestly, not a mocked version bump.

## Deferred

- **The other four rule categories**, and with them decision 2's Mega raid and showcase columns.
- **The profile switcher**, and the `areas` and `location` editing it implies.
- **Alerts**, though its tab ships disabled.
- **User-editable ordering.** A `position` column and drag handles, if the stable order proves
  insufficient. Adding it is a migration and changes the grouping key, since every row in a group
  would need to carry the same position.
- **The Poracle import**, including the location anchor and saved-locations table from decision 6.
- **The MapJS string DSL**, still, on the rules model's reasoning.

## Decisions and their reasoning

| decision | why |
| --- | --- |
| Pokémon only | The hardest category proves every piece the other four reuse. A vertical slice testers can form an opinion about beats four half-built ones. |
| Order stable, not editable | The list should never shuffle, but drag handles imply the top rule wins, which is the belief the model exists to remove. |
| Matched rule ids on the wire | The client must resolve appearance for every entity anyway; ids are smaller than resolved properties and the popup then costs nothing. |
| `rulesVersion` on the envelope | An unknown id catches a rule added elsewhere. Only a version catches one edited elsewhere, since an edit keeps its id. |
| Subscribe drops `filters` | Rules live in the database and the session identifies the user. Server-authoritative is smaller and cannot be lied to. |
| Seed on first login | Account creation misses every user the auth backfill migrates, who are the ones most likely to report an empty map. |
| Seed "Everything" | Zero rules is a blank map, and every user starts at zero. The simplest true instance of the model, not a special case. |
| Subject beside the name | Keeps the sentence short at 25 species and distinguishes two cards that share a name after a split. |
| One PvP league per rule | Poracle stores one per row, three pairs AND together which nobody means, and a rule holding three leagues is the set this schema exists to avoid. |
| IV and PvP stay combinable | Poracle does not forbid it; its matcher applies IV checks on PvP rows. The apparent mode is wildcards, not enforcement. |
| Alerts tab disabled, not absent | The affordance that says which list you are editing has to exist before the second list does. |
| Profiles seeded, switcher deferred | A switcher tests nothing about whether rules are understandable, and drags in area selection that is not filters. |

## For planning

- Whether `gender` and similar single-valued columns are integers or enums.
- The vocabulary of `rule.size`. The mockups in this document say "large" and "extra large" and the
  resolution example says `md` and `xl`; one set of values has to win, and `maxSize` needs a defined
  ordering over them.
- Whether the four teaching starting points on the empty state are seeded rows or created client
  side on tap. The "Everything" seed is settled as server side; these are a different question
  because they are offered rather than given.
- Whether `resolveAppearance` memoises per entity or recomputes per frame. deck.gl re-uploads on
  reference change, so this interacts with the array identity work already done in the transport
  plan.
- The exact wildcard sentinels for a future Poracle push: unbounded IV is `-1`/`100`, CP is
  `0`/`9000`, level is `0`/`55`. Getting these wrong silently narrows a filter rather than erroring.
