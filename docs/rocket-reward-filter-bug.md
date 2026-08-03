# Duplicate Rocket Pokemon filters in ReactMap main

## Scope

This document describes the original bug in ReactMap `main` at commit
`50cb6cfd` (`v1.49.1`): some Rocket reward Pokemon appeared twice in the
filter menu. Taillow is the known example used while fixing it.

This is separate from later issues encountered while developing the fix.

## Symptom

The Rocket Pokemon tab could contain two tiles both labelled **Taillow**.
Internally, however, they were different filters:

```text
a276-0
a276-3163
```

The key format is:

```text
a<pokemonId>-<formId>
```

Both keys identify Pokemon 276, but they contain different form IDs.

## Why main creates two entries

ReactMap builds its available Rocket reward filters from two sources.

### Confirmed scanner data

The `rocketPokemon` query reads the Pokemon and form stored in a confirmed
incident lineup. For Taillow, the scanner can contribute:

```text
a276-0
```

### Event masterfile fallback

`applyRocketPokemonFallback` also adds every configured possible reward from
`state.event.invasions`. For the same Taillow reward, the masterfile
contributes:

```text
a276-3163
```

Both values are added to a JavaScript `Set`. A `Set` removes only identical
strings; it does not know that both strings represent the same Pokemon.
Therefore `a276-0` and `a276-3163` both remain in the available list.

The client then creates the label using only the Pokemon portion of each key:

```js
const name = t(`poke_${id.slice(1).split('-')[0]}`)
```

For both keys, that expression extracts `276`. Consequently, two different
internal keys are rendered with the same visible name: **Taillow**.

## Why only one duplicate may work

On main, the database query first strips the form and searches by Pokemon ID:

```js
rocketPokemon.push(pokestop.slice(1).split('-')[0])
```

Both Taillow keys therefore retrieve candidate grunts for Pokemon 276.

ReactMap then runs `invasionMatchesFilters` as a secondary filter. Its original
matcher requires the complete form-specific key:

```js
filters[`a${pokemonId}-${formId ?? 0}`] || filters[`a${pokemonId}`]
```

This creates inconsistent behaviour:

- A confirmed scanner record using form `0` matches `a276-0`.
- An unconfirmed grunt checked against the masterfile form matches
  `a276-3163`.
- Both tiles look like Taillow, but each can affect a different data path.

The SQL stage treats Rocket rewards as a species, while the secondary filter
treats them as a species-and-form combination.

## Direct fix

Commit `ce0f73f0` fixes the original duplicate bug with two changes.

### 1. Match Rocket rewards by Pokemon ID

`hasRocketPokemonFilter` now checks whether any selected Rocket key belongs to
the requested Pokemon ID, regardless of its form suffix.

It accepts both supported shapes:

```text
a276
a276-3163
```

The comparison includes a key boundary, so Pokemon 1 cannot accidentally match
Pokemon 12.

This makes the secondary filter agree with the existing SQL query: Rocket
rewards are filtered by species ID, not by scanner/masterfile form ID.

### 2. Deduplicate available keys by species

`dedupeRocketPokemonKeys` groups every `a` key by Pokemon ID and keeps only one
key per species. For the original Taillow pair:

```text
Input:  a276-0, a276-3163
Output: a276-3163
```

The non-zero masterfile form is retained for compatibility with existing icon
and saved-filter handling. Because matching now uses Pokemon ID, that surviving
key works for scanner form `0` and masterfile form `3163` alike.

Deduplication is applied to both ways ReactMap obtains available Pokestop data:

- Golbat `/api/fort/available`
- The SQL `getAvailable` path

## Files changed by the direct fix

```text
server/src/filters/pokestop/rocketPokemonKeys.js
server/src/filters/pokestop/rocketPokemonKeys.test.js
server/src/models/Pokestop.js
```

## Later hardening in the final branch

The direct fix removes the duplicate entries found on main. Two follow-up
changes make that species-level approach reliable over time:

- `425077ba` derives the displayed key from the masterfile consistently, so a
  later poll cannot rename the same species because its scanner form changed.
- `a2fe5081` removes hidden all-form Rocket filters from the default filter
  builder, ensuring the one visible species filter is authoritative.

Those follow-ups support the completed implementation, but they are not the
reason main originally displayed two Taillow tiles. Changing Rocket filters to
default off was only a temporary workaround and is not part of the fix.

## Verification

After deploying and restarting ReactMap:

1. Open the Rocket Pokemon filters while Taillow is available.
2. Confirm that exactly one Taillow tile is shown.
3. Confirm that the same tile matches confirmed and unconfirmed Taillow grunts.
4. Turn off both Taillow and the relevant grunt-type filter; the grunt should
   disappear.
5. Turn on either Taillow or the grunt type; the grunt should appear through
   the intended OR filter behaviour.

Automated tests cover duplicate removal, form-independent matching, legacy
form-less keys, and Pokemon IDs with common numeric prefixes.
