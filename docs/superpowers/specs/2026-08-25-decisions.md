# Decisions, 2026-08-25

Answers to the questions that were blocking the Filters plan, plus the three
that were open for discussion. Recorded here because several contradict what
earlier specs assumed, and the Filters plan will be written against this file.

## 1. Rules have an order, and it does not resolve anything

Two earlier specs disagreed: one had drag-to-reorder with first match winning,
the other had no order at all. Neither was right.

Rules carry an order. It is recorded, the user sets it, and the UI always lists
them in it, so the list a person built reads back the same way every time.

That order does **not** decide visual output. Resolution stays per-property and
order-independent, as the newer spec had it: each glow rule contributes a
segment of the ring rather than overwriting the ones before it, the largest size
wins, and every other display property resolves on its own terms. Ordering is a
presentation fact about the list, not an evaluation rule.

This closes the "why is this one big" objection without paying for it in
resolution: the answer is that some rule asked for big and the largest request
wins, and the UI can point at which one.

## 2. Mega raids and showcase contests are filterable

Both, as columns on the rules schema. Both upstreams support them, adding
columns after rows exist is expensive, and this was the last cheap moment.

## 3. Size is a numeric range, not two booleans

`rule_pokemon.xxs` and `xxl` are replaced by a numeric size range matching the
upstreams. Golbat takes a size min and max; Poracle takes `size` and `max_size`
from 1 for XXS to 5 for XXL. Two booleans could not express a middle range and
round-tripped cleanly to neither.

## 4. `fort_in_memory` is required

Operators must enable it. Verified enabled on a production instance on
2026-08-25: `/api/status` reports `fort_in_memory: true` and `/api/fort/scan`
answers 200 with the same 66 gyms for a city block that `/api/gym/search`
returns.

This retires the recommendation in `2026-08-25-initial-fort-load.md`. The
un-gated `/api/gym/search` path stays documented there as the fallback if the
requirement is ever revisited, but it is not being built: it only ever covered
gyms, pokestops and stations had no equivalent, and requiring one config line
beats maintaining a second, slower code path for one of four layers.

## 5. The text filter syntax stays deferred

Not because it is unwanted, but to see whether the rules system can carry what
power users currently use it for. Revisit only if it cannot.

## 6. A Poracle import promises everything Poracle can track

Including the per-rule overrides ReactMap has no column for. Poracle's
`000004_per_rule_overrides` migration adds two columns to every tracking table
(`monsters`, `raid`, `egg`, `quest`, `invasion`, `lures`, `nests`, `gym`,
`forts`, `maxbattle`):

- `override_areas TEXT NULL` — a geofence list that **replaces** the person's
  global area subscriptions for that one rule, rather than intersecting with
  them.
- `override_location_label VARCHAR(64) NULL` — names a row in `user_locations`
  (`id`, `label`, `latitude`, `longitude`), and distance for that rule is
  measured from there instead of from the person's own position.

So one rule can say "within 2km of work" while the rest stay relative to home,
and another can fire only inside two named areas regardless of what its owner is
otherwise subscribed to.

Two properties of `resolveOverride` (`matching/generic.go:146`) that the import
has to respect. A label pointing at a saved location that no longer exists
**silently falls back** to the person's default position rather than erroring, so
a partial import would not announce itself. And the label is meaningless without
`user_locations`, so the saved places have to come across with the rules.

Scope still open: whether the first release carries both halves or only
`override_areas`, with saved locations deferred.

## 7. Do not wait on the incremental Golbat query

`updated_after` on the pokemon scan is proposed upstream and open. The design
works without it and gets cheaper if it lands. Build against what exists.
