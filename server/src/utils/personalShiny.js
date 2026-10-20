// @ts-check
const { golbatCapabilities } = require('../services/GolbatCapabilities')

/**
 * @typedef {{ playerId: string, label: string }} PersonalShinyPlayer
 * @typedef {'off' | 'include' | 'only'} PersonalShinyMode
 */

/** The game's gender values, which the v3 scan takes as a list */
const GENDERS = [0, 1, 2, 3]

/** No Pokémon matches it, but its clause still claims its pokemon */
const NO_MATCH = { iv: { min: 1, max: 0 } }

/**
 * The players a scan marks Pokémon for: the user's active ones, when the
 * Golbat can mark them
 * @param {{ personalShinyPlayers?: PersonalShinyPlayer[] }} args
 * @param {import('@rm/types').DbContext} ctx
 * @returns {PersonalShinyPlayer[]}
 */
function getPersonalShinyPlayers(args, ctx) {
  return ctx.mem &&
    args.personalShinyPlayers?.length &&
    golbatCapabilities.supportsFilter(ctx.mem, 'annotate_for')
    ? args.personalShinyPlayers
    : []
}

/**
 * @param {unknown} mode
 * @returns {PersonalShinyMode}
 */
function getPersonalShinyMode(mode) {
  return mode === 'include' || mode === 'only' ? mode : 'off'
}

/**
 * A v2 clause as the v3 scan takes it: gender as a list instead of a range
 * @param {import('@rm/types').DnfFilter} filter
 */
function toV3Filter(filter) {
  const { gender, ...rest } = filter
  if (!gender) return rest
  const genders = GENDERS.filter((g) => g >= gender.min && g <= gender.max)
  // an empty list is no condition at all
  return genders.length
    ? { ...rest, gender: genders }
    : { ...rest, ...NO_MATCH }
}

/**
 * The drawer's personal shiny mode applied to the scan's clauses. Include
 * adds the user's shinies next to every clause group, like the 0% and 100%
 * quick selects; only adds the condition to every clause.
 * @param {import('@rm/types').DnfFilter[]} filters
 * @param {PersonalShinyMode} mode
 * @param {string[]} playerIds
 * @param {import('@rm/types').FilterId[]} pokemon every pokemon key the scan has
 * @returns {import('@rm/types').DnfFilter[]}
 */
function withPersonalShinyMode(filters, mode, playerIds, pokemon) {
  switch (mode) {
    case 'include':
      return [...filters, { pokemon, shiny_for: playerIds }]
    case 'only':
      return filters.map((filter) => ({ ...filter, shiny_for: playerIds }))
    default:
      return filters
  }
}

/**
 * Expert clauses with the `shiny` term: shiny for the players, or never
 * matching when there are none to check
 * @param {import('@rm/types').DnfFilter[]} filters
 * @param {string[]} playerIds
 * @returns {import('@rm/types').DnfFilter[]}
 */
function withPersonalShinyTerm(filters, playerIds) {
  return filters.map(({ personal_shiny: shiny, ...filter }) => {
    if (!shiny) return filter
    return playerIds.length
      ? { ...filter, shiny_for: playerIds }
      : { ...filter, ...NO_MATCH }
  })
}

/**
 * Names the players Golbat found each Pokémon shiny for, by their labels
 * @param {(import('@rm/types').Pokemon & { shiny_for?: string[] })[]} results
 * @param {PersonalShinyPlayer[]} players
 */
function labelPersonalShinies(results, players) {
  const labels = new Map(
    players.map((player) => [player.playerId, player.label]),
  )
  results.forEach((pkmn) => {
    if (pkmn.shiny_for?.length) {
      pkmn.personal_shiny = pkmn.shiny_for
        .map((playerId) => labels.get(playerId))
        .filter(Boolean)
    }
  })
}

module.exports = {
  getPersonalShinyPlayers,
  getPersonalShinyMode,
  toV3Filter,
  withPersonalShinyMode,
  withPersonalShinyTerm,
  labelPersonalShinies,
}
