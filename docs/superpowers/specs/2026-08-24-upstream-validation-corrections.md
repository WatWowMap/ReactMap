# Upstream validation: corrections to the 2.0 specs

Three agents read Golbat and PoracleNG in full and checked every claim our five specs make about them. Twenty corrections came back. Four are contradictions between our own documents, where both versions are currently written down as decided.

Nothing here is a guess. Every item cites the upstream source that contradicts us.

## The four contradictions, which must be resolved before anything is published

**Rule ordering.** The client shape spec says filters are drag-reorderable and first match wins the display treatment, and makes that the answer to "why is this one big". The rules spec says rules have no order at all, no position column, and each display property resolves independently. Both are current. The rules spec is the later decision and argues against the earlier one by name, so the client shape spec's section 4 needs marking superseded.

**The MapJS DSL.** The client shape spec keeps it in four places, including a success criterion about lossless round-tripping and a property-based test plan. The rules spec defers it entirely and says the parser stays in 1.0 rather than moving. The security argument flips with it: one document says removing the DSL makes `vm.runInNewContext` disappear, the other says that call stays where it is and 2.0 simply never imports it.

**Coexistence.** The client shape spec makes two Vite entries and a per-user shell flag load-bearing, calling it "what lets 2.0 ship at 30% complete instead of becoming a branch that dies". The no-coexistence spec reverses it. The build artifacts survive; the architecture does not.

**Backups.** The client shape and rules specs both say the backups table dies. The transport spec lists backups among the roughly sixty surviving procedures. An implementer reading only the transport spec would port it.

## Poracle: the interop claim is wrong

The rules spec says Poracle stores one row per pokemon and form pair, citing `src/features/webhooks/services/Poracle.js`. Those lines are ReactMap's own UI code building a display string, not a statement about Poracle storage.

Poracle's `monsters` table is keyed on `uid` alone. For pokemon there is no match key at all: `tracking_queries.go:365` says outright that "Monster uses no diff match, it compares against ALL existing rows". A rule's identity is its entire field set, and several rows per species and form is the designed model. `diff.go:13` gives the reasoning: iv95 plus distance 500 and iv90 plus distance 1000 are meant to be separate rules.

So the push is a mapping, not an identity, and three consequences follow.

**PvP is one league per row.** `pvp_ranking_league` is a single integer beside a best and worst rank, so a `rule_pokemon` row carrying Great and Ultra ranges needs one Poracle row per league. A correction to this correction, caught on review: IV and a league are NOT mutually exclusive on one row. Nothing in the write path rejects both, and the matcher applies both gates, so a row carrying `min_iv` and a league fires only when both hold. The fan-out is per league, not per filter kind.

**Push is not idempotent.** Poracle updates in place only when exactly one field differs and that field is tagged updatable, which for monsters is `clean`, `distance`, `template` and `min_iv`. `max_iv` is not. Two changed fields at once inserts a second row. Repeated pushes of an edited rule accumulate duplicates rather than converging, so push has to delete by uid and re-insert, and ReactMap must retain the uid of every row it created. Neither spec mentions uid.

**And uid is not reliably returned.** `ApplyDiff` discards the uid the insert produced, so against a real database `created[].uid` is zero and `updated[].uid` is the old uid that was just deleted. The test suite misses it because the mock store writes the uid back and the real one does not. Any create must be followed by a re-read to learn the real uid.

**`pvp_target_species` does exist upstream**, contrary to both specs, but expressed as the evolution's own `pokemon_id` rather than a separate column, and gated behind an operator flag that defaults to off. This is the one place the two models genuinely disagree and the document should say so rather than claiming parity.

## Golbat: three that change the design

**The PvP rank filter is not a superset.** `calculatePokemonPvpLookup` collapses every entry to a single best rank per league across all evolutions and caps. A rule asking for Great rank 100 to 500 is excluded whenever some evolution ranks better than 100, and no local pass can recover an entity that was never returned. Any rule using a non-1 minimum rank must widen its upstream clause to 1 and compare locally.

**Reconciliation must respect `limit_reached`.** The v3 scan returns an envelope with `examined`, `skipped`, `total` and `limit_reached`; v2 discards those counts. `limit_reached` is the only signal that a response was truncated rather than complete, and the transport spec's rule that anything the client holds and the server does not return gets dropped will mass-evict live entities on any truncated response.

**Result caps are lower than our worked example.** `max_pokemon_results` defaults to 3000, and the delta sizing is built on a dense viewport of 5000. `GET /api/status` exists precisely so consumers can read the caps and the `fort_in_memory` flag at boot instead of discovering them by taking a 503. It is the one fort-related endpoint not gated behind that flag.

**Also:** 2.0 should call v3 rather than v2, where gender is an array instead of a min and max range. The combined `POST /api/fort/scan` returns all three fort types in one spatial traversal and no spec mentions it. `fort_in_memory` defaults to off and is marked experimental, gating eight endpoints. There is no `updated_after` filter anywhere, confirming our upstream proposal is still open.

**And the deletion is smaller than claimed.** "The direct-SQL path is deleted" is not achievable: only Pokemon, Gym, Pokestop, Station and Device call Golbat. Nests, portals, routes, scan cells, spawnpoints, tappables and weather are SQL-only, because Golbat exposes no endpoint for them. What goes away is the dual path for four models, which is still a real simplification. Golbat does ship a nests table with `pokemon_id`, `pokemon_form` and `pokemon_avg` while exposing no nest API, so "Golbat has no nest data" is true of the API and false of the schema.

## Schema corrections

`profile.preferences jsonb` is Postgres. This project is MySQL, where the type is `JSON`.

`rule_pokemon.xxs` and `xxl` as two booleans cannot express a middle range. Both upstreams model size as a range: Golbat takes a size min and max, Poracle takes size and max_size from 1 for XXS to 5 for XXL. Two booleans round-trip cleanly to neither.

Poracle carries per-row fields with no ReactMap column: costume, rarity, weight, min_time (a floor on seconds left before despawn, not time of day; schedules live on the profile), distance, template, ping, clean, and since its fourth migration, per-rule area and location overrides. The rules spec puts areas and location on the profile only, so importing silently drops any per-row override. That is data loss on import rather than a modelling gap.

## Capabilities we are not using

**Mega raid bosses are not expressible.** Golbat filters on `raid_temp_evolution_id` and Poracle has the same axis with `mega` keywords, but `rule_gym` has only `boss_species` and `boss_form`.

**Showcases reduce to "there is one here".** Golbat filters contests on pokemon, type, focus and ranking standard, and advertises the supported focus filters. The rules spec captures only `event_display_type = 9`.

Both are live user-facing features and the schema is the expensive thing to change later.

## Integration facts worth recording

Both upstreams authenticate with a single shared secret header, `X-Poracle-Secret` and `X-Golbat-Secret`. Neither has per-user credentials, so ReactMap is a trusted proxy and must enforce on its own side that a user can only reach their own data.

A Poracle human is a delivery destination, not an account, keyed by a Discord or Telegram platform id. The auth migration moves `discordId` and `telegramId` into Better Auth account rows, and whatever replaces them must still resolve a platform id or Alerts cannot address anyone.

Poracle has ten tracking types against our five categories, so the mapping is many to one in both directions: our gym covers raid, egg and gym; our pokestop covers quest, invasion, lure and fort; our station is maxbattle, which has no diff logic and always inserts, so station pushes duplicate unconditionally.
