# The initial fort load on a default Golbat

Written 2026-08-25, after Task 6 landed the webhook receiver and probing a real
Golbat showed the poll it was supposed to sit in front of does not exist.

## The problem

`fort_in_memory` is experimental and off by default. It gates eight endpoints
(`routes_huma.go:176-310`), `/api/fort/scan` among them, which answer 503 without
it. Measured on a production instance:

```
GET  /api/status     -> {"features":{"fort_in_memory":false}, ...}
POST /api/fort/scan  -> 503 {"detail":"fort_in_memory not enabled"}
```

Golbat's webhooks carry fort *changes*, never a snapshot. So on a default Golbat a
user opens the map and sees no gyms, no stops and no stations at all, until
something happens to change one. The transport plan named the fort poll as the
reconciliation cycle that heals whatever a dropped webhook delivery lost; for most
operators there is nothing to heal with.

## What is actually available without the flag

Auditing every fort route for its gate rather than assuming they share one:

| Route | Gated | Enumerates by area | Returns |
|---|---|---|---|
| `/api/fort/scan`, `/api/gym/scan`, `/api/pokestop/scan`, `/api/station/scan` | yes | yes | full records |
| the four `/available` routes | yes | whole instance | filter options |
| `/api/gym/search` | **no** | **yes, `bbox`** | **full gym records** |
| `/api/gym/query` | no | no, ids only (max 500) | full gym records |
| `/api/pokestop-positions` | no | yes, geojson fence | positions only |
| `/api/station/query` | no | no, ids only | full records |
| `/api/gym/id`, `/api/pokestop/id`, `/api/station/id` | no | no, one id | full record |

`/api/gym/search` is the find. It is un-gated, takes a `bbox` filter clause, has a
limit ceiling of 10,000, and despite `SearchGymsAPI` being typed `([]string,
error)` the route returns hydrated gym records. Confirmed against a real instance.

Nothing equivalent exists for pokestops or stations. `pokestop-positions` returns
`QuestLocation`, which is positions for quest scanning and not enough to render a
stop, and the station routes only take ids.

## Cost, measured

`/api/gym/search` reads the database rather than the in-memory cache, so it is
much heavier than the gated scan it substitutes for:

| Viewport | Gyms | Bytes | Time |
|---|---|---|---|
| City block | 66 | 109 KB | 0.64 s |
| Metro | 360 | 611 KB | 1.00 s |
| Region | 2,839 | 4.9 MB | 2.43 s |

Roughly 1.7 KB per gym, unfiltered. Tolerable as a one-time load at a normal
viewport. Not something to poll on, and not something to run at region zoom.

It also takes no DNF filter, only name, description, bounding box and radius, so
everything the user's rules ask for has to be applied locally afterwards. That is
already how the design handles the fields Golbat cannot filter on, so it is not a
new mechanism.

## Where this leaves each layer

**Gyms work without the flag.** Initial load from `/api/gym/search` over the
viewport bbox, live updates from the webhook receiver Task 6 built. No
`fort_in_memory` anywhere in that path.

**Pokestops and stations do not.** There is no un-gated way to enumerate either by
area with enough data to draw them. For those two layers `fort_in_memory` is a
real requirement, not a preference.

## The options

**A. Require `fort_in_memory` for everything.** What the plan assumes today.
Simplest, fastest at runtime, and it is one config line. It makes an experimental,
Draft-badged flag a hard dependency for the whole map, and an operator who will not
enable it gets no forts at all.

**B. Use `/api/gym/search` for the initial gym load, require the flag only for
stops and stations.** Gyms then work everywhere. Costs a second code path for
gyms, and a slow first paint at wide zoom. Stops and stations still degrade to
nothing without the flag, so this does not remove the dependency, it narrows it to
two layers from four.

**C. Ask upstream to un-gate the fort scans, or to default `fort_in_memory` on.**
The cleanest outcome and the one that helps every consumer, not just us. Costs
nothing to ask and does not block: B is the fallback if the answer is no, and
becomes dead code if the answer is yes. There is already an open conversation
upstream about incremental queries, so this is a second ask on a live thread
rather than a cold one.

## Recommendation

C and B together. Ask upstream, and implement B meanwhile, because a map whose
gyms appear on a default install is worth a slower first paint and one extra code
path. Hold the line on stops and stations requiring the flag rather than inventing
a third mechanism for them, and say so plainly in the operator documentation
instead of letting an empty layer look like an empty area.

The thing not to do is B for all four layers by reaching for
`/api/pokestop-positions` and `/api/*/id`, hydrating stops one id at a time. That
is hundreds of round trips for one viewport, and it would be a worse product than
telling the operator to set one config line.
