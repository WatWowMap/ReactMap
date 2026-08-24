# ReactMap 2.0: the rules model

**Session:** 2 of 3
**Depends on:** nothing. This is the dependency.
**Blocks:** Plan 5 (Filters UI) and session 3 (transport).

## Scope

How a user's filters are stored, evaluated, and moved to and from Poracle. Session 1 settled the
interaction: a filter is a name and a sentence, editing happens in a sheet over the map, Filters and
Alerts are identical twins with separate ownership. None of that is reopened here.

What this session decides is everything below the sentence: the tables, what a rule can express, how
several matching rules resolve, how species and forms are selected, and what happens to a user's
existing filters.

## What this replaces

Filters today are not in a database. They live in `localStorage` via zustand's `persist` middleware
(`src/store/useStorage.js`), so they are per browser and vanish when a cache is cleared. The
`backups` table is the manual escape hatch for exactly that, which is why it dies once filters are
server side.

The shape is one `PokemonFilter` per enabled form, each carrying `iv`, `atk_iv`, `def_iv`, `sta_iv`,
`level`, `cp`, `gender`, `xxs`, `xxl` and per league PvP arrays. The normal flow is "enable
everything, customise a few", so a typical user carries hundreds of entries that are identical
defaults. All of it is flattened into a GraphQL JSON scalar on every query and every 20 second poll.

## The schema

### A shared rule, typed conditions, one species table

Five categories get rules: pokemon, gym, pokestop, station, nest.

Everything a rule has in common lives in one table, so anything referencing a rule has a single
foreign key to point at. Every other table is a child of it and is named for what it holds, so the
prefix groups them and the convention never mixes.

```sql
rule
  id, user_id, profile_id
  category            -- pokemon | gym | pokestop | station | nest
  name
  size, glow, notify
```

Conditions live in a table per category, as typed columns. There is no shared condition table, no
`type` discriminator, and no polymorphic value column.

This is the most important decision in the document. A generic condition bag cannot be understood
without reading the evaluator, and this codebase has already paid for that kind of cleverness once.
Adding a condition means a migration, which is the correct signal that you changed what a rule can
say.

```sql
rule_pokemon
  rule_id
  iv_min, iv_max
  atk_min, atk_max,  def_min, def_max,  sta_min, sta_max
  level_min, level_max
  cp_min, cp_max
  gender
  xxs, xxl
  great_min, great_max,  ultra_min, ultra_max,  master_min, master_max
```

```sql
rule_nest
  rule_id
  avg_min, avg_max          -- pokemon_avg, spawns per hour
```

```sql
rule_gym
  rule_id
  raid_levels int[]         -- egg tiers, gym.js `eggs`
  team
  slots_min, slots_max      -- available_slots
  ex_eligible, ar_eligible, in_battle, has_badge
```

```sql
rule_station
  rule_id
  battle_levels int[]       -- station.js `battleLevels`
  gmax_stationed
  include_inactive          -- default false; station_active is otherwise implied
```

```sql
rule_pokestop
  rule_id
  quests_enabled, invasions_enabled, lures_enabled, event_stops_enabled
  invasion_ids int[]
  lure_ids int[]
```

Invasions are named individually rather than filtered by class. 1.x carries `onlyExcludeGrunts` and
`onlyExcludeLeaders`, coarse "hide this whole category" toggles that existed because invasions could
not be selected one at a time. With `invasion_ids` you simply do not select them, which is the same
reasoning that removed the global hide rule.

### Quests are their own table

Quest conditions attach to a reward, not to a rule. 1.x stores them per reward key as
`"title__target,title__target"` in that reward's `adv` field
(`src/components/filters/QuestConditions.jsx:43-51`), against a catalogue the server builds into
`DbManager.questConditions`. "Catch 10 Pokemon" narrows one reward; it says nothing about the others.

That is a one to many, and columns on `rule_pokestop` were hiding it.

```sql
rule_quest
  id
  rule_id                   -- FK to rule_pokestop(rule_id), not to rule
  reward_type               -- 1 xp, 2 item, 3 dust, 4 candy, 7 encounter, 9 xl, 12 and 20 mega
  item_id                   -- type 2
  amount_min, amount_max    -- types 1, 3, 12, 20

rule_quest_condition
  rule_quest_id
  title, target
```

The foreign key points at `rule_pokestop`, not at `rule`. `rule_pokestop` is keyed by `rule_id`, so
this costs nothing and means a quest reward can only exist on a rule that actually has a pokestop
part. Pointing it at `rule` would have made quests a sibling of the pokestop conditions rather than
part of them, and nothing would have stopped a quest reward being attached to a pokemon rule.

Quest reward species are not columns here. They live in `rule_species` like every other species
reference, linked back by `rule_quest_id`.

### Species references are one table

Every category references species, and four of them already key on the same `<id>-<form>` pair:

| category | reference | source |
| --- | --- | --- |
| pokemon | the spawn, plus the PvP evolution | `PokemonFilter`, `PvPRankEntry.pokemon` |
| nest | the nesting species | `Nest.js:50` |
| gym | the raid boss | `gym.js:117-123`, `parseIdFormPair` |
| station | the max battle boss | `station.js:55-67`, `parseIdFormPair` |
| pokestop | quest rewards and rocket rewards | `pokestop.js:194-228` |

So species references are the most common thing in the schema, and they get one table. No other table
carries a species and form pair.

```sql
rule_species
  rule_id            -- FK to rule
  rule_quest_id      -- FK to rule_quest, NULL for every role except quest_reward
  role               -- see below
  species_id
  form_id            -- NULL means any form of this species
  excluded           -- boolean, default false
```

```
spawn            the pokemon that spawned
nesting          the species nesting at this location
pvp_target       the evolution a PvP rank belongs to
raid_boss        gym
battle_boss      station
rocket_reward    pokestop invasions
quest_reward     pokestop quests; which kind of reward comes from rule_quest.reward_type
```

Seven roles rather than ten. There is no `quest_candy`, `quest_encounter`, `quest_xl` or `quest_mega`
role, because `rule_quest.reward_type` already carries that and a role repeating it would be a second
source of truth.

`rule_species.rule_id` is derivable from `rule_quest_id` when that is set. It is kept anyway, so that
"every species this rule references" is one query with no join, which is the read path that actually
runs. It is redundant and checkable rather than ambiguous.

**This is normalisation, not the polymorphism rejected above.** In a polymorphic condition bag the
columns change meaning per row: `num_min` is an IV on one row and a level on the next. Here they
never do. `species_id` is always a species and `form_id` is always a form or "any". Only what the
pair is for varies, and `role` names it explicitly.

Every role names a concrete thing in the domain. There is no general purpose "subject" role, because
"the pokemon that spawned" and "the species nesting here" are different concepts that happened to
share a shape.

**Why `excluded` is a column and not a role.** An exclusion has to know what it subtracts from. As a
role it could only say "not this species, somewhere", so a pokestop rule filtering both encounter and
candy rewards could not exclude a species from one without excluding it from both. As a column
alongside the role it is exact:

```
(role='quest_reward', rule_quest_id=5, species_id=129, excluded=true)   that reward, but not Magikarp
(role='spawn',        species_id=129, excluded=true)                    spawns, but not Magikarp
```

**Read discipline.** Any query that forgets `excluded = false` silently inverts meaning. Exactly one
function reads this table, and it returns included and excluded already separated. That predicate
must not appear at a call site.

### A worked example

"Larvitar candy, only from Catch 10 Pokemon quests", on a pokestop rule:

```
rule                   id=42,  category=pokestop,  name='Larvitar candy'
rule_pokestop          rule_id=42,  quests_enabled=true
rule_quest             id=5,  rule_id=42,  reward_type=4
rule_species           rule_quest_id=5,  role=quest_reward,  species_id=246,  form_id=NULL
rule_quest_condition   rule_quest_id=5,  title='catch_pokemon',  target=10
```

An item reward carries no species at all: one `rule_quest` row with `item_id` set and nothing in
`rule_species` pointing at it.

Breaking quests out also preserved a capability an earlier draft had dropped. 1.x groups mega energy
rewards by amount (`server/src/filters/fort/pokestop.js:210-219`,
`megaByAmount.forEach((pokes, amt) => ...)`), so different species can carry different thresholds
inside one filter. With amounts as columns on `rule_pokestop` that would have collapsed to one range
per rule. With a row per reward it survives: two thresholds is two `rule_quest` rows.

### form_id NULL means any form

The single most important correction made during this session. Storing `species int[]` alongside
`forms int[]` describes a cross product: species {Rattata, Raticate} with forms {Alolan} means
Alolan Rattata and Alolan Raticate, and there is no way to express "normal Rattata plus Alolan
Raticate". That is why 1.x keys on `${species}-${form}`. The composite key is the correct model, not
legacy debt.

`NULL` earns its place twice. It is the common case, since "I want Larvitar" rarely means one
specific Larvitar, and it means a form added to the game later is included automatically. A rule
that enumerated every form at selection time goes quietly stale the next time a costume ships.

### Exclusions are rule local

There is no hide treatment and no global blocklist. Exclusions are rows on the rule that owns them,
so "IV 90 and above except Magikarp" is one rule that says exactly that and cannot affect any other
rule. A global hide acts at a distance: it silently subtracts from every rule in the list, and six
months later nobody remembers why the shiny families filter has a hole in it.

The honest cost is that "never show this anywhere" now means excluding it on each rule that would
otherwise match. That is more work, and it is the right more work, because each exclusion is visible
where it applies.

### Everything else is preferences

The categories that are genuinely on or off (s2cells, scan areas, scan cells, spawnpoints, devices,
portals, weather, routes) do not get rules or tables. They live in one column:

```sql
profile
  id, user_id, system, name
  areas, location
  preferences jsonb
```

**The guardrail, which belongs in code review as much as here:** that column holds display
preferences only. Things read whole, written whole, and never evaluated server side. The moment
something in it needs to be queried, matched against an entity, or reasoned about by the server, it
graduates to a table. Deferring a decision is prudent when the exit condition is written down in
advance and turns into rot when it is not.

Routes are the most likely graduate. If they turn out to carry real conditions the way nests did,
they get a table.

## Evaluation

### Direction

Forward only, per connection. Each connected client has a viewport and a rule set, and the server
evaluates that user's rules against what is in the viewport. ReactMap never asks "this spawn
appeared, which users care", because that is Poracle's job and duplicating it buys nothing.

Conditions are stored as columns rather than a blob so that a reverse index remains possible without
a migration if that ever changes. It is not being built.

### Rules do not have an order

There is no `position` column. Rules are a set. Reordering does not exist, editing one rule writes
one row, and two devices editing different rules cannot conflict.

Two separate questions get answered separately:

- **Does it show at all?** Any matching rule makes it visible.
- **How does it look?** Each display property resolves on its own.

| property | resolution |
| --- | --- |
| notify | true if any matching rule sets it |
| size | the largest any matching rule specifies |
| glow | matching rules that specify a glow each paint a ring segment, up to three |
| exclusions | rule local, so a rule simply does not match |

Resolving each property independently is what makes this work. A Gible that is both a rare spawn and
Great League relevant gets the large size from one rule and the blue ring from the other, because
both statements are true and neither has to win. Under first match wins it got the size and lost the
glow, which is intent the user expressed and the system discarded.

Size taking the maximum is more intuitive than an ordering: if one rule says this matters, make it
extra large, and another says medium, extra large is what was meant. Importance composes upward on
its own.

The structural consequence worth stating: **adding a rule can only ever add visibility.** No rule can
hide what another shows, because exclusions are rule local. That makes the list safe to experiment
with, which is the property that matters most for users who are not going to read documentation.

### The remaining ambiguity

Two rules specifying different glows, both matching, is resolved by ring segments up to three
distinct colours. Beyond three it is noise, and the marker popup lists every match anyway. This is
the one place the model is arbitrary rather than principled, and it is bounded.

### Ring segments

One matching glow paints a full ring. Two paint half each. Three paint thirds. Both colours survive,
no third colour is invented, and "several rules matched" becomes visible rather than inferred.

Colour mixing was considered and rejected. Gold plus blue producing green invents a meaning nobody
assigned, collides with whatever green already means, and is actively worse for colourblind users.
Map colours mean specific things, which is why the data palette is firewalled from the brand accent
elsewhere in this project.

## The picker

Species tiles by default, one per species, showing default form art. A species with multiple forms
carries an affordance on the tile.

- Tapping the tile selects that species with any form. One row, `form_id NULL`.
- Tapping the affordance expands that species into its forms as individual tiles. Selecting Alolan
  Raticate alone stores `(20, 61)` and does not select Raticate.
- Search matches form names as well as species names. Typing "alolan" surfaces every Alolan form
  across all species, so nobody has to expand species one at a time hoping to find one.
- Selection state renders per form, so a partially selected species looks partially selected.

Search plus a "select all shown" action is what makes "hundos for these 25 species" one rule and a
handful of taps rather than the 25 enable-then-customise cycles 1.x requires.

The grid itself is 1.x's `react-virtuoso` component restyled. It works, and a toggle re-renders one
cell rather than the list.

## Poracle interop

Poracle stores one tracking row per (pokemon, form) pair with a falsy form meaning any form
(`src/features/webhooks/services/Poracle.js:93,144,422`). ReactMap never reads Poracle's database and
never couples to its schema; it calls the HTTP API and maps at the boundary.

### Push

A projection, not a translation:

```js
rows.map((row) => ({
  pokemon_id: row.species_id,
  form: row.form_id ?? 0,
  min_iv: rule.iv_min,
  max_iv: rule.iv_max,
}))
```

25 pairs in, 25 tracking entries out. `NULL` to `0` is the entire impedance mismatch. This works
because the pair table already stores what Poracle stores. A cross product model would have had to
expand first and could not have represented "Alolan Raticate but not Raticate" at all.

Push is worth treating as the test for any future schema change. A shape that cannot round trip to
the system already integrated with is wrong regardless of how clean it looks alone.

### Pull

Lossier, because Poracle rows are flat pairs carrying their own conditions. The import dialog offers
the choice explicitly, with live counts so the decision is concrete rather than abstract:

```
Pull from Alerts                      38 tracked Pokémon found

  (o)  Merge alerts with identical conditions   ->  12 filters
  ( )  One filter per alert                     ->  38 filters
```

Whichever is chosen is a copy. Twins stay explicit push or pull rather than a sync, so copies staying
copies is the intended behaviour.

## Why is this one like this

The feature that carries everything above for users who will not read an explanation.

Tapping a marker shows which rules produced its appearance:

> Large because **Rare spawns** matched.
> Blue ring from **Great League**.
> Not notifying, because no matching rule asks to.

And on the filters page, a rule shows how many currently visible entities it is responsible for.

Every "why does this look like that" question is answered by tapping the thing, rather than by
reading a list top to bottom and simulating the resolution mentally. This is what replaces first
match wins as the answer, and it is a better answer, because it names the rules rather than
describing a procedure.

## Migration

There is none. 2.0 starts with an empty filter list and the four teaching starting points from
session 1: 100% IV, Great League, shiny families, rare spawns. Each creates a real, editable rule.

The reasoning: filters were never durable, so users already lose them routinely. The old model is the
problem being solved, and importing it imports the problem. A faithful translation would open 2.0 to
a list of several hundred rules, which carries the enumeration problem into the new UI rather than
fixing it.

Anyone with heavily tuned filters rebuilds by hand. That cost is real and is accepted.

## Deferred

**The MapJS string DSL, entirely.** No Sentence and Text toggle, no live echo, no parser in 2.0. The
goal is one way to build a filter, and a second notation invites confusion about which is
authoritative.

Nothing needs preserving to keep this option open. The parser and its `vm.runInNewContext` call live
together in `server/src/filters/pokemon/functions.js:7,186`, which stays exactly where it is serving
1.0. 2.0 simply never imports it, and therefore never inherits that security finding rather than
having to remove it.

If it returns, the cheap shape is a one way paste box on the empty state, never an editor mode. It
would use the existing parser once, produce rules, and discard the string. A top level `|` producing
two filters is acceptable in a one time dialog in a way it is not in a live toggle.

**A reverse index.** Not built. The column model leaves it possible without a migration.

**Rule ordering.** Not built, and not expected to return, since per property resolution answers the
question ordering existed to answer.

## Decisions and their reasoning

Recorded because the reasoning is the part that gets lost.

| decision | why |
| --- | --- |
| No migration from 1.x | Filters were never durable. Importing the old model imports the enumeration problem. |
| Forward evaluation only | Alerts are Poracle's job. Reverse matching duplicates it. |
| Five rule categories | Gyms, stops, stations and nests all carry ranges or per type enumeration, not just toggles. |
| One table per category | A generic condition bag cannot be read without reading the evaluator. This codebase has paid for that before. |
| Species as (species, form) pairs | Separate arrays describe a cross product and cannot express "normal Rattata plus Alolan Raticate". |
| `form_id NULL` for any form | Matches the common case, and includes forms added to the game later. |
| No rule ordering | Ordering forces conflicts between statements that do not conflict, and makes CRUD write many rows. |
| Size takes the maximum | Importance composes upward. Nothing needs to lose. |
| Notify is a boolean OR | A rule is a statement of interest. Suppressing one because another matched discards intent. |
| Ring segments, not mixing | Mixing invents a colour meaning nobody assigned and hurts colourblind users. |
| Exclusions per rule, no global hide | A global hide acts at a distance and is unfindable six months later. |
| Preferences as JSON | Read whole, written whole, never evaluated. Different problem from rules. |
| DSL deferred | One way to build a filter. The parser stays in 1.0 and costs nothing to keep. |

## For planning

Things deliberately left for the implementation plan rather than decided here.

- Whether `gender`, `team` and similar single valued columns are integers or enums.
- Whether `rule_pokestop.invasion_ids` is enough on its own. 1.x narrows by incident display type and
  then confirms the specific reward in a second pass
  (`server/src/filters/fort/pokestop.js:236-245`), deliberately, because the reward is a slot one
  value that an optional invasion check populates and a reward derived filter can drop stops that
  should match. Invasion ids may need a display type companion for the same reason.
- How the sentence renders a rule whose species selection is large. "25 Pokémon" with a peek is
  probably right, but that is a UI question.
- Indexes. `(user_id, profile_id)` on every rule table is obvious; anything else waits for a real
  query shape.
- Whether the four teaching starting points are seeded rows or created client side on tap.
