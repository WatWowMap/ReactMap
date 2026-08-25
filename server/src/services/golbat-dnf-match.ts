// server/src/services/golbat-dnf-match.ts
//
// A local matcher for Golbat's own DNF filter vocabulary
// (`ApiPokemonDnfFilter3`, decoder/api_pokemon_scan_v3.go; field names
// cross-checked against `rules-to-golbat-filters.js`, which builds these
// same clauses from ReactMap's rules model). This is NOT that translation
// layer -- Task 3 turns a rule row into a clause; this module goes the
// other way, testing whether an already-fetched entity satisfies a clause
// it was already given.
//
// Why this exists in Task 5 at all: the transport acceptance suite's
// subscribe contract has the client send Golbat's own DNF filter array
// directly (there is no rules table on this branch yet -- see
// transport.acceptance.js's header comment), and the fake Golbat used to
// drive that suite does not itself implement DNF matching -- it is a thin
// response-shape fixture, not a filtering engine, so it hands back every
// fixture it was configured with regardless of what `filters` a request
// carried. A real Golbat DOES filter, so `viewport-scanner.js`'s
// `scanPokemonComplete` already sends `filters` upstream. This module is
// what makes that filtering also hold locally, as `computeDelta`'s
// `localFilter` (delta-engine.js) -- both so a connection subscribed to
// species X never receives species Y from a Golbat that, for whatever
// reason, under-filtered, and so it behaves correctly against the fake
// Golbat this branch's acceptance suite actually runs against.
//
// Scope: only the fields the pokemon scan's DNF actually carries, per
// `rules-to-golbat-filters.js`'s `buildPokemonClause`: `pokemon` (id/form
// pairs), `iv`, `atk_iv`, `def_iv`, `sta_iv`, `level`, `cp`, `gender`. PVP
// league ranges (`pvp_little`/`pvp_great`/`pvp_ultra`) are NOT matched here
// -- no acceptance criterion exercises them, and Golbat's own PVP
// collapsing (the reason `rule-local-filter.js` exists at all) means a
// faithful local PVP check needs the same care that module already went
// through. Leaving it out here rather than guessing at a shortcut; a future
// task wiring the real rules pipeline through this socket is what should
// add it, reusing `rule-local-filter.js` rather than this module.
//
// Fort clauses (Task 6). These stopped being optional the moment forts
// started arriving by push: Golbat's webhook sender broadcasts the same
// payload to every configured webhook (webhooks/webhook.go's getPayload
// filters by TYPE and AREA, never by a DNF clause), so a pushed gym has
// passed through no upstream filtering at all. This matcher is the only
// thing standing between a raid the subscription asked for and one it did
// not. Scope is `buildGymClause`'s own fields (rules-to-golbat-filters.ts)
// plus `raid_temp_evolution_id`, matched against Golbat's `ApiGymResult`
// column names (decoder/api_gym.go:139-183); pokestop, station and quest
// clause fields are left out because no category subscribes to them yet.

function matchesRange(
  value: number | null | undefined,
  range: { min?: number; max?: number } | undefined,
): boolean {
  if (!range) return true
  if (value == null) return false
  if (range.min != null && value < range.min) return false
  if (range.max != null && value > range.max) return false
  return true
}

/**
 * @param entity Golbat's ApiPokemonResult shape.
 * @param clause One element of the `filters` DNF array.
 */
function entityMatchesPokemonClause(entity: any, clause: any): boolean {
  if (Array.isArray(clause.pokemon) && clause.pokemon.length > 0) {
    const matchesIdForm = clause.pokemon.some(
      (pair: any) =>
        pair.id === entity.pokemon_id &&
        (pair.form == null || pair.form === (entity.form ?? null)),
    )
    if (!matchesIdForm) return false
  }
  if (!matchesRange(entity.iv, clause.iv)) return false
  if (!matchesRange(entity.atk_iv, clause.atk_iv)) return false
  if (!matchesRange(entity.def_iv, clause.def_iv)) return false
  if (!matchesRange(entity.sta_iv, clause.sta_iv)) return false
  if (!matchesRange(entity.level, clause.level)) return false
  if (!matchesRange(entity.cp, clause.cp)) return false
  if (Array.isArray(clause.gender) && clause.gender.length > 0) {
    if (!clause.gender.includes(entity.gender)) return false
  }
  return true
}

/**
 * A `computeDelta`-shaped `localFilter` (delta-engine.js) for pokemon.
 *
 * An empty/omitted `filters` array means "this subscription asked for no
 * species filter", so everything upstream returned for this viewport
 * passes -- deliberately the opposite of Golbat's own wire convention
 * (`rules-to-golbat-filters.js`'s trap 1: an empty upstream `filters` array
 * matches NOTHING there). That convention exists to stop a caller from
 * accidentally polling forever for a rule set with zero rows; it has
 * nothing to say about what an already-connected socket's own "no filter
 * configured" state should mean, which is "show me the viewport",
 * matching every acceptance criterion that subscribes with `filters: []`
 * and still expects entities back.
 *
 */
function matchesPokemonFilters(filters: object[]): (entity: any) => boolean {
  if (!Array.isArray(filters) || filters.length === 0) return () => true
  return (entity) =>
    filters.some((clause) => entityMatchesPokemonClause(entity, clause))
}

/**
 * Golbat's `ApiDnfId` pair list -- decoder/api_fort.go:114-117. A null/absent
 * `form` matches any form of that pokedex id.
 */
function matchesDnfIds(
  pairs: any[],
  pokemonId: unknown,
  formId: unknown,
): boolean {
  return pairs.some(
    (pair) =>
      pair?.pokemon_id === pokemonId &&
      (pair?.form == null || pair.form === (formId ?? null)),
  )
}

/**
 * One `ApiFortDnfFilter` clause (decoder/api_fort.go:72-104) against one gym.
 *
 * An ABSENT field on the entity is treated as unknown and does not reject,
 * while a field that is present and null does. That asymmetry is the whole
 * reason this is written by hand rather than borrowed from the pokemon
 * matcher: a webhook-delivered gym is a PATCH carrying only what its
 * payload carried (golbat-webhook.ts), so a `gym_details` change to a gym
 * the client is watching arrives with no raid columns at all, and
 * rejecting it against a raid clause would silently drop it. A gym from a
 * scan response, by contrast, always carries every key -- `raid_level:
 * null` there really does mean "this gym has no raid", and rejects.
 *
 * The cost of that choice is a webhook patch that under-filters: a
 * `gym_details` push for a gym whose raid does not match still reaches the
 * client. It is delivering a fact about a gym the client can see rather
 * than a raid it did not ask for, which is the safer of the two errors.
 */
function entityMatchesFortClause(entity: any, clause: any): boolean {
  const known = (value: unknown) => value !== undefined

  if (Array.isArray(clause.raid_level) && known(entity.raid_level)) {
    if (!clause.raid_level.includes(entity.raid_level)) return false
  }
  if (Array.isArray(clause.team_id) && known(entity.team_id)) {
    if (!clause.team_id.includes(entity.team_id)) return false
  }
  if (
    Array.isArray(clause.raid_pokemon_id) &&
    known(entity.raid_pokemon_id) &&
    !matchesDnfIds(
      clause.raid_pokemon_id,
      entity.raid_pokemon_id,
      entity.raid_pokemon_form,
    )
  ) {
    return false
  }
  if (
    Array.isArray(clause.raid_temp_evolution_id) &&
    known(entity.raid_pokemon_evolution)
  ) {
    if (!clause.raid_temp_evolution_id.includes(entity.raid_pokemon_evolution))
      return false
  }
  if (clause.available_slots && known(entity.available_slots)) {
    if (!matchesRange(entity.available_slots, clause.available_slots))
      return false
  }
  if (
    typeof clause.is_ar_scan_eligible === 'boolean' &&
    known(entity.ar_scan_eligible)
  ) {
    if (Boolean(entity.ar_scan_eligible) !== clause.is_ar_scan_eligible)
      return false
  }
  return true
}

/**
 * A `computeDelta`-shaped `localFilter` (delta-engine.ts) for forts, and
 * the routing predicate `subscription-registry.ts` uses to decide which
 * subscriptions a pushed fort belongs to.
 *
 * An empty/omitted `filters` array means "no fort filter configured", so
 * everything in the viewport passes -- the same deliberate inversion of
 * Golbat's own wire convention that `matchesPokemonFilters` documents.
 */
function matchesFortFilters(filters: object[]): (entity: any) => boolean {
  if (!Array.isArray(filters) || filters.length === 0) return () => true
  return (entity) =>
    filters.some((clause) => entityMatchesFortClause(entity, clause))
}

export { matchesFortFilters, matchesPokemonFilters }
