# Alerts and Poracle: what shipped with known gaps

Written at the end of the Alerts plan, from its final whole-branch review. Everything here was
found, judged, and deliberately left. None of it blocks the feature working.

## Needs a design decision, not a fix

**A Poracle outage renders "No alerts yet" to someone who has alerts.**

Two deliberate behaviours combine badly. `poracle-human.ts` keeps the last known human state through
an outage, so a brief Poracle restart does not make the tab vanish for everyone. `alerts-router.ts`
degrades a failed snapshot to an empty one rather than a 500. Each is right alone. Together, a user
whose cached state says `present` sees the human panel with no profiles, no areas and no locations,
and the words "No alerts yet" — a claim about their subscriptions, made from a connection failure.
Because the server answers 200, react-query also replaces good cached data with the empty result, so
the alerts visibly disappear rather than going stale.

This is the failure the spec's three-state design exists to prevent, arriving through a seam rather
than through either half.

Two ways out, and picking one is the decision. Either `snapshot` throws something the client can
tell apart from "you have nothing", or `status` stops answering `present` from cache when the
current check failed. The first keeps the outage-resilience the cache was added for; the second is
simpler and gives it up.

Related, same area: if the snapshot query rejects while `status` says `present`, the page renders a
heading and a "New alert" button and nothing else, with no message.

## Worth doing, nobody is blocked

- **A failed `availableAreas` is invisible.** The server throws `SERVICE_UNAVAILABLE`, the hook
  returns `[]`, and the picker is silently empty with a disabled button. `error` aggregates
  mutations only; all three queries sit outside it.
- **Every non-404 4xx becomes `BAD_GATEWAY`.** A duplicate location label is a 409, a referenced
  location delete is a 409, and Poracle's override validation is a 422. All three are things a
  person could act on, all three read as an upstream failure.
- **`pokemonBlocked` is computed on every `status` call and read by nobody.** The router comment
  says the read side uses it to tell a client the tab is read-only. It does not. A blocked human
  gets a fully editable tab where every write fails into the banner. Wire it or delete the claim.
- **`deleteLocation`'s comment is wrong about why it exists.** It says Poracle would let the delete
  through and fall back silently. Poracle actually returns 409 with a `referencing_rules` payload.
  The pre-check is still worth keeping for the better message, but it only reads pokemon rules, so a
  location referenced by a raid or quest rule made in Discord passes our check and comes back 409.

## Cosmetic

- The card list mixes every profile's alerts and never says which profile a row belongs to. With two
  profiles it reads as duplicates.
- Species render as "Pokémon #149" while the catalogue is already fetched two lines away.
- The Alerts nav entry renders during `loading` and then disappears for accounts without a human, so
  the grid reflows 4 to 3 after a flash.
- `status` fetches `/v2/humans/{id}` twice per call.
- An operator adding an area to `areasToSkip` after a human selected it silently un-selects it on
  that human's next area edit.

## The spec overpromises, and the plan already narrowed it

§2 of the design spec says all 15 Poracle-only fields get real UI. They do not, and the plan's task 9
scoped 12. What actually shipped: `costume` has no UI at all; the delivery tail (`ping`, `clean`,
`distance`, `template`, `overrideLocationLabel`) renders in the sentence but cannot be edited,
because the editor draws `vocabulary.conditions` and never `tail`; and `ping` can never have UI at
all, since Poracle manages it server-side and its v2 rule carries no `ping` field in either
direction, which makes the vocabulary's ping entry permanently dead.

`distance` is the spec's own headline example, "DM me for any Pokemon with IV 100% within 5 km", and
it is read-only. Correct the spec or finish the tail.
