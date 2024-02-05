// @ts-check
const { Event, Db } = require('../../initialization')
const BaseFilter = require('../Base')

/**
 *
 * @param {import("@rm/types").Config['defaultFilters']} defaults
 * @param {import('../pokemon/Frontend')} base
 * @param {import('@rm/types').PokemonFilter} custom
 * @returns {{
 *  full: { [key: string]: import('@rm/types').PokemonFilter },
 *  raids: { [key: string]: BaseFilter },
 *  quests: { [key: string]: BaseFilter },
 *  nests: { [key: string]: BaseFilter },
 *  rocket: { [key: string]: BaseFilter },
 * }}
 */
function buildPokemon(defaults, base, custom) {
  const pokemon = {
    full: { global: custom },
    raids: { global: new BaseFilter() },
    quests: { global: new BaseFilter() },
    nests: { global: new BaseFilter() },
    rocket: { global: new BaseFilter() },
  }
  const energyAmounts = new Set([
    ...defaults.pokestops.baseMegaEnergyAmounts,
    ...Event.getAvailable('pokestops')
      .filter((e) => e.startsWith('m'))
      .map((e) => e.split('-')[1]),
  ])

  Object.entries(Event.masterfile.pokemon).forEach(([id, pkmn]) => {
    Object.keys(pkmn.forms).forEach((form) => {
      pokemon.full[`${id}-${form}`] = base
      pokemon.raids[`${id}-${form}`] = new BaseFilter(defaults.gyms.pokemon)
      pokemon.quests[`${id}-${form}`] = new BaseFilter(
        defaults.pokestops.pokemon,
      )
      if (Db.filterContext.Pokestop.hasConfirmedInvasions) {
        pokemon.rocket[`a${id}-${form}`] = new BaseFilter(
          defaults.pokestops.invasionPokemon,
        )
      }
      pokemon.nests[`${id}-${form}`] = new BaseFilter(defaults.nests.allPokemon)
    })
    if ('family' in pkmn) {
      if (pkmn.family === +id) {
        pokemon.quests[`c${pkmn.family}`] = new BaseFilter(
          defaults.pokestops.candy,
        )
        pokemon.quests[`x${pkmn.family}`] = new BaseFilter(
          defaults.pokestops.candy,
        )
      }
    }
    if ('tempEvolutions' in pkmn) {
      energyAmounts.forEach((a) => {
        pokemon.quests[`m${id}-${a}`] = new BaseFilter(
          defaults.pokestops.megaEnergy,
        )
      })
    }
  })
  return pokemon
}

module.exports = buildPokemon
