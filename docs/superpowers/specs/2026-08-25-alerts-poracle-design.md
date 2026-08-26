# ReactMap 2.0: Alerts and Poracle

**Status:** approved design, pending the 1.x authorization audit in section 7.

**Depends on:** the rules model (`2026-08-24-reactmap-2-0-rules-model-design.md`), the shipped
filters plan (`2026-08-25-filters-design.md`), decision 6 in `2026-08-25-decisions.md`, and §4 of
the client shape spec (`2026-08-23-reactmap-2-0-client-shape-design.md`).

**Scope:** Pokemon only, matching the filters plan. The other four rule categories are out, and
this is the last piece of taking Pokemon to 110% before any of them start.

---

## 1. What this builds

Three surfaces against a Poracle instance, all of them Pokemon only.

**The Alerts tab.** The pink twin of Filters. Same card, same sentence editor, same species
picker, different data and a different owner. It reads Poracle's tracking snapshot and writes
through Poracle's V2 tracking endpoints.

**The human panel.** Profiles, areas, saved locations, and the master enable and disable toggle.
Not optional extras: `profile_no` is a column on every monster row, `distance = 0` means "use my
areas", and `override_location_label` points into the saved locations table. Skip any of them and
the rows render wrong.

**Push and pull.** A transfer list dialog that copies rules between ReactMap and Poracle in either
direction. One shot each way, never a sync.

Deferred, each self-contained enough to add later without disturbing the above: the language
picker (`POST /v2/humans/{id}/language`), mutes (`/v2/humans/{id}/mutes`, held in memory and
cleared by a processor restart), and summary schedules, which arrive in the snapshot as
`summaries` and have no UI here.

---

## 2. The vocabulary boundary

This is the one piece of new architecture, and it exists because of a constraint §4 states
plainly: ReactMap never reads Poracle's database or couples to its schema.

Poracle's `monsters` table has 35 columns. ReactMap's `rule` table already covers 20 of them by
meaning: species, form, IV, CP, level, attack, defence, stamina, gender, size, and the three PvP
ranking columns. The remaining 15 are Poracle's alone, split evenly between conditions and
delivery settings.

Full parity on the Alerts tab means all 15 get real UI. Doing that by teaching the existing editor
about Poracle's columns would spread the coupling through every component. Instead the editor
becomes parameterized.

`ConditionEditor` and `describeRule` stop being hardcoded to ReactMap's columns and take a
**vocabulary descriptor**: the list of conditions, their types, their bounds, their labels, and how
each renders into the sentence. Filters passes ReactMap's vocabulary; Alerts passes Poracle's. One
component, two schemas, and the coupling lives in a single boundary file.

The vocabulary carries the delivery settings too, which is what makes the two sentences read
differently while sharing a grammar:

```
Filters   Show any Pokemon with IV 100% as an XL gold icon
Alerts    DM me for any Pokemon with IV 100% within 5 km
```

Poracle's tail is `ping`, `clean`, `distance`, `template`, `profile_no`, and
`override_location_label`. ReactMap's is `size`, `glow`, and `notify`.

A consequence worth stating: the two vocabularies are not subsets of each other. Poracle has
conditions Filters will not have even after section 4 widens it, and Filters has appearance
properties Poracle has no concept of. That asymmetry is expected. The grammar is shared; the
vocabulary is not.

---

## 3. The Alerts tab

### Reading

One call. `GET /v2/humans/{id}/tracking?all_profiles=true&include_descriptions=true` returns the
human record, every tracking type's rules, profiles, saved locations, summary schedules, and active
mutes in a single document. Nothing else needs fetching to render the tab.

The per-type list at `GET /v2/humans/{id}/tracking/pokemon` returns byte-identical envelopes and
exists for narrower refreshes. Note its default scope is the human's *active* profile, so anything
showing rules across profiles must pass `all_profiles=true` or an explicit `?profile=`.

### Writing

Six operations on `/v2/humans/{id}/tracking/pokemon`:

| Operation      | Method and path        | Notes                                              |
| -------------- | ---------------------- | -------------------------------------------------- |
| Create         | `POST` base            | Body is an array. Keeps diff and upsert behaviour. |
| Read one       | `GET` base`/{uid}`     | Scoped by human and uid                            |
| Full replace   | `PUT` base`/{uid}`     | Delete and insert. Returns a **new** uid.          |
| Delete one     | `DELETE` base`/{uid}`  | Scoped by human and uid                            |
| Bulk delete    | `DELETE` base          |                                                    |

Two properties of these that the client has to be built around rather than discover later.

**Editing changes a rule's identity.** `PUT` is delete and insert, and the replacement receives a
new uid returned in `{updated}`. Any client cache keyed on uid is invalidated by its own save, so a
save reconciles from the response rather than assuming the row it edited still exists. This is not
specific to `PUT`; see "Uids are never stable across a write" in section 5.

**Poracle enforces row ownership.** Every by-uid operation calls `v2FindOwnedRow(typ, deps,
human.ID, profileNo, in.UID)` and 404s when the uid is not owned by that human. A client-supplied
uid is therefore safe to forward. The value a client must never influence is the `{id}` path
segment, which is covered in section 7.

---

## 4. Pull, and what ReactMap's rule table gains

Pull imports Poracle alerts as ReactMap rules. Where Golbat can feed a condition, ReactMap gains a
column so the import is lossless. Where it cannot, the loss is reported by name rather than
happening quietly, which is the rule decision 6 set for `override_areas`.

Verified against a live Golbat scan rather than assumed. Six columns are added to `rule`:

| New column         | Poracle source                         | Golbat field                       |
| ------------------ | -------------------------------------- | ---------------------------------- |
| `weight_min`       | `min_weight`                           | `weight`                           |
| `weight_max`       | `max_weight`                           | `weight`                           |
| `costume`          | `costume`                              | `costume`                          |
| `min_time_seconds` | `min_time`                             | derived from `expire_timestamp`    |
| `pvp_min_cp`       | `pvp_ranking_min_cp`                   | `pvp.<league>[].cp`                |
| `pvp_cap`          | `pvp_ranking_cap`                      | `pvp.<league>[].cap`               |

The two PvP columns were nearly written off on their names. `matching/pokemon.go:226` compares
`leagueData.CP` against `PVPRankingMinCP`, and `:229` checks `PVPRankingCap` against the entry's
caps, so Golbat's own PvP payload feeds both exactly.

`min_time_seconds` carries a caveat the editor must state rather than hide. It is derived from
`expire_timestamp`, which is only trustworthy when `expire_timestamp_verified` is true. On an
unverified spawn the despawn time is a guess, so a time-remaining condition means something weaker
there.

### The one real loss

`rarity` and `max_rarity` are dropped, and every imported rule that set them is named in the import
report.

Poracle computes rarity from observed spawn frequency in a rolling window
(`processor/internal/tracker/rarity.go`, thresholds configured as percentages). It does export the
result at `GET /api/stats/rarity` as group to pokemon ids, so ReactMap could technically evaluate
it. It will not, because doing so would make the Filters tab depend on Poracle being reachable, and
§4 requires Filters to work with Poracle offline. The reason is a design constraint, not a
technical limit, and the report should say so.

### The report

One report covers both kinds of loss: the dropped rarity conditions from above, and the
`override_areas` behaviour change decision 6 already specified. It names every affected rule and
says what that rule will do now. Decision 6's wording holds: dropping a setting the user chose is
acceptable when they are told, and not acceptable quietly.

---

## 5. Push

A transfer list dialog. The left column is every ReactMap filter with its computed resemblance
against what Poracle already holds; the right column is the batch being copied. Tail fields sit
below as batch inputs, one value for the whole push.

Batch only. One distance for everything in the batch, and someone wanting two distances runs the
dialog twice.

The header carries a running count, because a grouped ReactMap card expands into one Poracle row
per species. "3 filters, 41 alerts" is the honest number and the card count is not.

One shot. No stored uid, no ownership, no sync. Push the same filter twice and the resemblance on
the left says so.

### Resemblance is a prediction, the response is the truth

`POST` keeps Poracle's diff and upsert behaviour and returns `{created, updated, unchanged}`. Both
numbers belong in the UI at different moments: computed resemblance previews what is about to
happen, and the response reports what did.

Computing resemblance correctly needs three facts about Poracle's diff, none of which are
guessable from the endpoint documentation.

**Only four monster fields can ever be edited in place.** `DiffTracking` classifies every field by
its `diff` struct tag, and on `MonsterTrackingAPI` the tags fall out as:

| Tag             | Fields                                                        |
| --------------- | ------------------------------------------------------------- |
| `diff:"update"` | `clean`, `distance`, `template`, `min_iv`, and nothing else   |
| `diff:"-"`      | `uid`, `id`, `profile_no`                                     |
| `diff:"match"`  | none on monsters                                              |
| untagged        | everything else, including `ping`                             |

An untagged field is the default branch, which increments `nonUpdatableDiffs`. So changing `ping`
alone forks a new row, and so does changing any condition other than `min_iv`.

**Two changes fork a row even when both are individually updatable.** `diff.go` updates only when
`totalDiffs == 1 && nonUpdatableDiffs == 0`. Its own comment says why, and names the case:
"Multiple diffs (even if all updatable) create a new row, matching PoracleJS behavior where e.g.
iv95+d500 and iv90+d1000 are separate rules."

**Monsters have no match key, so a candidate is compared against every row in the target profile.**
That is what `tracking_queries.go:365` means by comparing against all existing rows. It is scoped:
`v2HandleCreate` fetches `typ.scopedRows(deps, human.ID, profileNo)`, so the comparison stays
within one profile. Resemblance is computed against the profile the push targets, not across all of
them.

### Uids are never stable across a write

Worth stating once, because it holds on every path rather than just the obvious one. `PUT` is
documented as delete and insert. The diff-update path does the same thing: `ApplyDiff` calls
`store.DeleteByUIDs` and then `store.Insert` for rows it classified as updates. No Poracle write
path preserves a uid, so nothing on the ReactMap side may treat one as a durable identifier.

### Silence

`POST` accepts `?silent=true`, which suppresses the confirmation push. Without it a batch push
notifies the user about the batch they just performed. The dialog sets it.

---

## 6. The human check

ReactMap never creates a Poracle human. Poracle creates one when a person receives the right
Discord roles. ReactMap's job is to find out whether one exists and to render accordingly.

The check runs at login and its result is cached on the session. Three states:

| State               | Alerts tab                                                     |
| ------------------- | -------------------------------------------------------------- |
| Human exists        | Live                                                            |
| No human            | Absent entirely, not disabled and not greyed                    |
| Poracle unreachable | Keep the last known answer; a first login during an outage gets no tab |

Caching is what keeps a thirty second Poracle restart from making the tab vanish for everyone
mid-session, and it avoids a ping on every page load.

### 1.x had no equivalent, and its own attempt is dead code

Worth recording so nobody ports the wrong thing.

1.x gated the webhook UI on `perms.webhooks` alone, a role-derived permission computed at login
that never contacted Poracle. It did call `oneHuman`, but only to read `blocked_alerts`
(`resolvers.js:619`), never to ask whether the human existed. When Poracle was down or returned
nothing, `human.blocked_alerts` threw, the resolver returned nothing, the category list came back
empty, and `Manage.jsx` rendered the full dialog with every footer button disabled by
`disabled: !categories.length`. An empty tab with dead buttons.

A proper screen for this state does exist at `src/features/webhooks/Error.jsx`, with translated
copy in every locale. Nothing imports it. Its copy reads "You may not be registered with
{{webhook}}\nOr the server is currently unreachable", which is 1.x stating in the user-facing text
that it could not tell the two states apart.

---

## 7. Authorization

One Poracle instance, not many. That decision is section 7.1, and it deletes most of what this
section would otherwise have had to say.

What remains comes from a five-lens audit of the 1.x tree at `3a128a4b`, which found 33 controls
and 17 places where a missing or empty value grants more access rather than less. Roughly half of
those findings were about choosing between instances and are now moot.

### 7.1 One instance

`config.webhooks` stops being an array and becomes a single `config.poracle` object. There is no
instance name, no selection, no per-user stored choice, and no selector in the UI.

`provider: 'poracle'` was the only value that field ever carried, so multi-provider was notional
as well. `trialPeriodEligible` goes with it, since the trial period is already absent from 2.0. The
rest of the per-instance settings survive as plain settings: `host`, `port`, `poracleSecret`,
`addressFormat`, `nominatimUrl`, `geocoderProvider`, `areasToSkip`, and the three role lists.

`perms.webhooks: string[]` becomes `perms.alerts: boolean`. It is a grant rather than a list, and
`alerts` is what the tab is called. This is free to do now: `webhookPerms` has two call sites
(`telegram-perms.ts:53`, `local-perms.ts:62`) and nothing in 2.0 reads the result yet.

A boolean also sidesteps 7.6 for this key. `mergePerms` folds non-array values with
`existingValue || incomingValue`, which is the correct OR for a grant.

### 7.2 What dropping instances removes

Recorded because these were real controls in 1.x, and their absence in 2.0 should read as a
decision rather than an oversight.

Gone entirely: the `selectedWebhook` column, `validateSelectedWebhook`, the `webhookChange`
mutation, the `Event.webhookObj[name]` lookup, the `/api/settings` backfill at
`rootRouter.js:174-192`, and the instance selector UI.

**Including the audit's single most dangerous finding.** `validateSelectedWebhook` was correct and
never revoked anything, because its only call site guarded the result:

```js
const selectedWebhook = await validateSelectedWebhook(req.user, Db, Event)
if (selectedWebhook) {
  req.user.selectedWebhook = selectedWebhook
  req.session.save()
}
```

A null return, which is what revocation produces, was a no-op. Nothing cleared the session value or
the database column, so losing a Discord role left the stale capability in place. It compounded:
the call site sat inside the `fabButtons` resolver, so it ran only when a client queried that
field, and 1.x's seven webhook read paths did not agree on how to gate. Three checked
`perms?.webhooks` for truthiness (`resolvers.js:578`, `:197`, `:641`) while four checked membership
(`:610`, `:618`, `:633`, `:740`).

The category mistake underneath is worth keeping even though the specific bug is now unreachable:
**`selectedWebhook` was treated as a stored preference rather than as a capability.** It read like
`locale`, a column set once and read everywhere, so the missing re-authorization looked like
ordinary code rather than an absent check.

With one instance there is nothing to select, so nothing to go stale. The remaining question is
only whether this user may use Alerts at all, which is answered from `perms.alerts` on every
request and never read from a user row.

### 7.3 The controls that still matter

| Control | 1.x location | Carry into 2.0 as |
| --- | --- | --- |
| Role to Poracle grant | `utils/webhookPerms.js` | `perms.alerts`, boolean |
| Platform id resolved server side | `Poracle.js:120-138` | Never from client input (7.4) |
| Category subtraction | `Poracle.js:113-119` | `disabledHooks` minus `blocked_alerts` |
| Secret never leaves the server | `Poracle.js:94-106` allow-list | Explicit allow-list, not schema pruning (7.5) |

Two 1.x controls are deliberately not carried. The trial period (`Trial.js`) is already documented
as absent in 2.0 and stays absent. `Poracle.js:64`'s `admins` field is dead in 1.x, never read or
written, and should not be recreated.

### 7.4 What a client may never influence

Poracle scopes by the `{id}` path segment. Whatever ReactMap puts there is the identity Poracle
acts as. That value is derived server side from the session, and no procedure accepts it as input.
With instance selection gone, this is the only remaining input a client must never reach.

A client may supply a `uid`, because Poracle checks ownership itself: every by-uid tracking
operation calls `v2FindOwnedRow(typ, deps, human.ID, profileNo, in.UID)` and 404s when the uid is
not owned by that human.

A client may supply a profile number, but ReactMap validates it against the profile list from the
snapshot first. `resolveHuman` takes `profileNo` from the `?profile` query parameter without
checking that the human owns that profile.

`resolveHuman` also 404s an unknown id and never autocreates, which is what makes the three states
in section 6 distinguishable directly from Poracle's responses.

### 7.5 The GraphQL schema was closing holes nobody was checking

1.x's `api(userId, 'humans')` returns the raw `GET /api/humans/{id}` body, and
`api(userId, 'areaSecurity')` returns the raw `GET /api/geofence/{id}` body. Neither response's
keys exist as fields on `type Poracle`, so Apollo silently drops them before anything reaches a
browser.

That is the only reason those paths leak nothing. It is a property of the schema declaration rather
than of any authorization code, and both reach Poracle through the weaker of the two gate styles.

2.0 is tRPC. There is no field pruning. Porting the `api()` dispatch shape verbatim behind a
procedure converts an accidental deny-by-default into an allow-by-default. Every procedure returns
an explicitly constructed object, never a passthrough of a Poracle response.

The same reasoning applies to the secret. `getClientContext`'s hand-picked allow-list is correct
and is kept, but it is currently the second of two layers, and the first one is disappearing.

### 7.6 The 2.0 perms gap is four keys, not one

`computeDiscordPerms` sets `admin`, `blocked`, `blockedGuildNames` and `trial`. `telegram-perms.ts`
and `local-perms.ts` also set `webhooks`, `scanner`, `scannerCooldownBypass` and `areaRestrictions`.
Discord, the primary strategy and the platform Poracle DMs through, sets none of those four.

For this spec, the missing grant blocks everything: no Discord user can reach Poracle at all. That
is the first task, and it lands as `perms.alerts` per 7.1.

The missing `areaRestrictions` is more dangerous but not yet live. Nothing in 2.0 consumes
`perms.areaRestrictions` and no area filtering is wired into the map path. It matters here only
because the fix has a trap: `areaPerms` returns `[]` to mean unrestricted, so
`perms.areaRestrictions ?? []` would grant every Discord user unrestricted area access. Whoever
wires area restrictions must make the perms object total, with every array key present and
defaulted, rather than coalescing at the point of use.

`mergePerms` folds two providers' perms by unioning every array-valued key. For a grant list that
is right. For `areaRestrictions` it is not, because of the same empty-means-unrestricted sentinel:

- `['north']` union `['south']` gives both, correct for accumulating allowlists.
- `[]` union `['north']` gives `['north']`, so linking a restricted account silently removes
  unrestricted access.

That fails closed, so it is a correctness bug rather than an escalation, and it is live in 2.0
today. It is listed here because it is the same sentinel, not because this spec fixes it.

### 7.7 Read the code at 3a128a4b, do not run it

`3a128a4b` is the last commit with the 1.x server intact, but it is a hybrid: Better Auth had
already replaced Passport, and `auth-session.js` builds `req.user` from the Better Auth row, which
has no `selectedWebhook` column. Every webhook resolver at that commit gates on
`req.user?.selectedWebhook`, so the entire Poracle path is inert there.

The code is authoritative. The behaviour is not. Anyone trying to verify 1.x empirically at this
commit will conclude the feature does nothing.

### 7.8 Acceptance criteria this section owes

Written failing first, like the rest.

1. A user whose Alerts grant is revoked between requests is denied on the next request, with no
   logout and no cache clear.
2. No procedure accepts a Poracle human id as input. Asserted structurally over the router, not by
   testing procedures one at a time.
3. No Poracle response is returned to a client unmodified.
4. The Poracle secret does not appear in any procedure output, log line, or error body.
5. A Discord account resolves a complete perms object, with every array key present and
   `perms.alerts` set.
6. Requesting a profile the human does not own is rejected before anything is forwarded.

---

## 8. Testing

Acceptance criteria are written failing first, as the merge gate, matching the filters plan.

The filters plan taught one lesson that this spec has to answer directly. Its acceptance criteria
drove `rules.create` over RPC and never touched UI wiring, and the result was that the entire
editing surface shipped unreachable: `RuleSheet`, `SpeciesPicker`, `ConditionEditor` and
`SplitWarning` all had passing tests and no importer outside their own test files.

So every acceptance criterion here that concerns a surface must reach that surface the way a person
does, starting from a rendered tab. A criterion satisfied by calling a procedure directly does not
count as covering the UI that procedure exists for.
