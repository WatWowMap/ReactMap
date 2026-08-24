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

### Every rule row is singular

The decision this schema turns on. A rule names **one** thing: one species, one reward, one invasion
character, one lure. It never holds a set.

Sets were the source of every hard question in this design. Once a rule holds several species and
several rewards, something has to record which species belongs to which reward, and every answer to
that is worse than the problem: a nullable foreign key, a second species table, or a role that
duplicates a column that already exists. Singular rows delete the question rather than answering it.

`NULL` still means "any", so this does not force enumeration. "Hundos on everything" is one row with
`species_id IS NULL`, not a thousand rows. Enumeration happens only when a user genuinely enumerates,
and 25 chosen species is 25 rows against the hundreds of entries the same user carries in
localStorage today.

```sql
rule
  id, user_id, profile_id
  category            -- pokemon | gym | pokestop | station | nest
  name
  size, glow, notify
```

```sql
rule_pokemon
  rule_id
  species_id, form_id            -- NULL means any
  pvp_target_species             -- NULL means any evolution; see the Azumarill case
  iv_min, iv_max
  atk_min, atk_max,  def_min, def_max,  sta_min, sta_max
  level_min, level_max
  cp_min, cp_max
  gender
  xxs, xxl
  little_min, little_max,  great_min, great_max,  ultra_min, ultra_max
```

There is no master league column. The configured leagues are little at 500, great at 1500 and ultra
at 2500 (`config/default.json`, `api.pvp.leagues`). Master has no CP cap, so its rank is decided by
IVs alone and a column for it would duplicate `iv_min` and `iv_max`.

```sql
rule_nest
  rule_id
  species_id, form_id            -- NULL means any
  avg_min, avg_max               -- pokemon_avg, spawns per hour
```

```sql
rule_gym
  rule_id
  raid_level                     -- NULL means any
  boss_species, boss_form        -- NULL means any
  team
  slots_min, slots_max
  ex_eligible, ar_eligible, in_battle, has_badge
```

```sql
rule_station
  rule_id
  battle_level                   -- NULL means any
  boss_species, boss_form
  gmax_stationed
  include_inactive               -- default false; station_active is otherwise implied
```

```sql
rule_pokestop
  rule_id
  role                           -- quest | invasion | lure | event_stop

  reward_type                    -- role=quest. 1 xp, 2 item, 3 dust, 4 candy,
                                 --   7 encounter, 9 xl, 12 and 20 mega
  item_id                        -- reward_type 2
  reward_species, reward_form    -- reward types 4, 7, 9, 12, 20
  amount_min, amount_max         -- reward types 1, 3, 12, 20

  invasion_character_id          -- role=invasion
  lure_id                        -- role=lure
  event_display_type             -- role=event_stop. 7 goldstop, 8 kecleon, 9 showcase
```

A pokestop rule does one thing. `role` says which, and a check constraint per role should reject the
combinations that make no sense, so the database enforces it rather than trusting the interface.
Invasions and event stops both key on `incident_display_type` in 1.x
(`server/src/filters/fort/pokestop.js:7,270`), with rocket being display types 1 to 4.

The four `*_enabled` booleans an earlier draft carried are gone, along with `exclude_grunts` and
`exclude_leaders`. Those existed because invasions could not be named individually; now they can, so
not selecting one is how you exclude it.

```sql
rule_pokestop_condition
  rule_id, title, target
```

The one join table that survives, because a single reward genuinely carries several conditions. 1.x
stores them per reward as `"title__target,title__target"` in that reward's `adv` field
(`src/components/filters/QuestConditions.jsx:43-51`), against the catalogue the server builds into
`DbManager.questConditions`. That catalogue stays the source of truth.

### Exclusions

Singular rows remove the set an exclusion used to be local to, so "IV 90 and above on everything
except Magikarp" needs somewhere to put the exception:

```sql
rule_exclusion
  rule_id, species_id, form_id     -- form_id NULL means any form
```

**Invariant: exclusions are only meaningful on a rule whose own species is NULL.** A rule naming one
species has nothing to carve out of. Worth a check constraint, and worth stating in the editor, since
the control should simply not appear on a rule that names a species.

This stays rule local. There is no global blocklist and no hide treatment, because a global hide acts
at a distance: it silently subtracts from every rule in the list, and six months later nobody
remembers why the shiny families filter has a hole in it.

### Grouping is derived, never stored

Singular rows are correct for storage and wrong for a person reading a list, so the interface groups
them. That grouping is computed, not persisted. There is no group table and no group id.

**Two rules group when they are identical in every column except the one that identifies them**,
which is species for pokemon and nests, reward for quests, character for invasions, and lure for
lures. That makes grouping deterministic, reversible, and free of a second source of truth about
which rules belong together.

Given that definition, "editing one rule ungroups it" is not behaviour anyone implements. Change one
row's `iv_min` and it stops matching its siblings, so it falls out of the group by itself. That
property only holds while grouping stays derived.

Two consequences worth knowing. Renaming a group is N writes, since `name` lives on each row. And the
split must be **visible at the moment it happens**, because silently lengthening someone's filter
list when they nudge a slider is exactly the kind of surprise that generates support questions. The
editor says it: "This will separate Larvitar from the other 24."

Creation works the other way round. The user selects 25 species in one pass and the form writes 25
rows. They never type 25 rules, and they never see 25 cards unless they ask to.

### Species selection

Species and form are columns on the rule that references them, and every category that references a
species uses the same pair:

| category | column | source |
| --- | --- | --- |
| pokemon | `species_id`, `form_id` | the spawn |
| pokemon | `pvp_target_species` | the evolution a PvP rank belongs to |
| nest | `species_id`, `form_id` | `Nest.js:50` |
| gym | `boss_species`, `boss_form` | `gym.js:117-123`, `parseIdFormPair` |
| station | `boss_species`, `boss_form` | `station.js:55-67`, `parseIdFormPair` |
| pokestop | `reward_species`, `reward_form` | `pokestop.js:194-228` |

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

Not a projection any more. An identity.

Poracle stores one tracking row per (pokemon, form) pair with a falsy form meaning any form
(`src/features/webhooks/services/Poracle.js:93,144,422`). Singular rules store exactly the same
thing, so a push is a field rename:

```js
rules.map((rule) => ({
  pokemon_id: rule.species_id,
  form: rule.form_id ?? 0,
  min_iv: rule.iv_min,
  max_iv: rule.iv_max,
}))
```

A grouped filter of 25 species is 25 rows and becomes 25 tracking entries. `NULL` to `0` is the
entire impedance mismatch.

This is worth treating as the standing test for any future schema change. An earlier draft of this
document stored species and forms as separate arrays, which describes a cross product and cannot
represent "normal Rattata plus Alolan Raticate" at all. That bug was invisible while reasoning about
the schema on its own terms and obvious the moment it had to round trip to a system that already
exists.

### Pull

Also one to one. 38 tracked pokemon become 38 rules, because Poracle's row and this schema's row are
the same shape.

An earlier draft of this document proposed a switch during import, merged or separate, with live
counts. Singular rows make it unnecessary. Storage is always separate, and merged is a view the
grouping layer produces from identical rows. So the choice stops being a decision made once at import
and baked in, and becomes a toggle that can be flipped whenever, on any set of filters, including
ones created by hand.

That is strictly better. An import time choice is the worst moment to ask, because the user has not
seen the result yet.

Whichever way it renders, the rules are a copy. Twins stay an explicit push or pull rather than a
sync, so copies staying copies is intended.

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
| Every rule row is singular | Sets forced something to record which species belonged to which reward. Every answer to that was worse than the question. |
| `NULL` means any | Singular rows do not force enumeration. "Hundos on everything" is one row. |
| Grouping is derived | No group table and no group id, so editing one row ungroups it by itself rather than by rule. |
| No migration from 1.x | Filters were never durable. Importing the old model imports the enumeration problem. |
| Forward evaluation only | Alerts are Poracle's job. Reverse matching duplicates it. |
| Five rule categories | Gyms, stops, stations and nests all carry ranges or per type enumeration, not just toggles. |
| One table per category | A generic condition bag cannot be read without reading the evaluator. This codebase has paid for that before. |
| Species and form as a pair | Separate arrays describe a cross product and cannot express "normal Rattata plus Alolan Raticate". |
| No master league column | Master has no CP cap, so its rank is decided by IVs alone and would duplicate `iv_min` and `iv_max`. |
| No rule ordering | Ordering forces conflicts between statements that do not conflict, and makes CRUD write many rows. |
| Size takes the maximum | Importance composes upward. Nothing needs to lose. |
| Notify is a boolean OR | A rule is a statement of interest. Suppressing one because another matched discards intent. |
| Ring segments, not mixing | Mixing invents a colour meaning nobody assigned and hurts colourblind users. |
| Exclusions rule local, no global hide | A global hide acts at a distance and is unfindable six months later. |
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
