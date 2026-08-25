// @ts-check
// server/src/services/golbat-dnf-match.js
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
// Gym/fort clauses are out of scope entirely: no acceptance criterion in
// this task exercises fort-side local filtering (criterion 5, the only fort
// criterion, is expected to stay red until Task 6's webhook receiver
// exists -- see the Task 5 report), so `matchesFortFilters` below is
// deliberately a pass-through rather than a guessed-at implementation of
// fields nothing here can test.

/**
 * @param {number | null | undefined} value
 * @param {{min?: number, max?: number} | undefined} range
 * @returns {boolean}
 */
function matchesRange(value, range) {
  if (!range) return true
  if (value == null) return false
  if (range.min != null && value < range.min) return false
  if (range.max != null && value > range.max) return false
  return true
}

/**
 * @param {any} entity Golbat's ApiPokemonResult shape.
 * @param {any} clause One element of the `filters` DNF array.
 * @returns {boolean}
 */
function entityMatchesPokemonClause(entity, clause) {
  if (Array.isArray(clause.pokemon) && clause.pokemon.length > 0) {
    const matchesIdForm = clause.pokemon.some(
      (pair) =>
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
 * @param {object[]} filters
 * @returns {(entity: any) => boolean}
 */
function matchesPokemonFilters(filters) {
  if (!Array.isArray(filters) || filters.length === 0) return () => true
  return (entity) =>
    filters.some((clause) => entityMatchesPokemonClause(entity, clause))
}

/**
 * See module header: no criterion in this task exercises fort-side local
 * filtering, so this stays a pass-through rather than a guess.
 *
 * @param {object[]} _filters
 * @returns {(entity: any) => boolean}
 */
function matchesFortFilters(_filters) {
  return () => true
}

module.exports = { matchesPokemonFilters, matchesFortFilters }
