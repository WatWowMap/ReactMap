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

## 6. A Poracle import promises the location anchor, not the area list

Poracle's `000004_per_rule_overrides` migration adds two columns to every
tracking table (`monsters`, `raid`, `egg`, `quest`, `invasion`, `lures`,
`nests`, `gym`, `forts`, `maxbattle`). ReactMap takes one of them.

**In scope: `override_location_label VARCHAR(64) NULL`.** It names a row in
Poracle's `user_locations` table (`id`, `label`, `latitude`, `longitude`), and
distance for that rule is measured from there rather than from the person's own
position. So one rule can say "within 2km of work" while everything else stays
relative to home. ReactMap needs a saved-locations table of its own to hold the
places, since the label is meaningless without them.

**Out of scope: `override_areas TEXT NULL`.** In Poracle this replaces the
person's global geofence subscriptions for one rule, rather than intersecting
with them. ReactMap already has its own area model and is not adopting
Poracle's per-rule one.

**What that costs, and what the importer owes the user because of it.** An
imported rule that carried `override_areas` will now fire against the person's
ReactMap areas instead of the narrower list they had set on that rule. That is
the silent data loss this question was originally asked about, so it must not
be silent: the importer reports every rule it changed the area behaviour of,
names them, and says what they will do now. Dropping a setting the user chose is
acceptable when they are told; it is not acceptable quietly.

There is a matching trap on the half being kept. `resolveOverride`
(`matching/generic.go:146`) falls back to the person's default position when a
label points at a saved location that no longer exists, silently and without
error. An import that brings rules across without their `user_locations` rows
would therefore produce rules that look right and quietly measure from the wrong
place. The saved locations come across with the rules or the labels do not come
across at all.

## 7. Do not wait on the incremental Golbat query

`updated_after` on the pokemon scan is proposed upstream and open. The design
works without it and gets cheaper if it lands. Build against what exists.
