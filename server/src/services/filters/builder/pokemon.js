/* eslint-disable no-restricted-syntax */
const { Event } = require('../../initialization')
const BaseFilter = require('../Base')
const { map } = require('../../config')

module.exports = function buildPokemon(defaults, base, custom, available) {
  const pokemon = {
    full: { global: custom },
    raids: { global: new BaseFilter() },
    quests: { global: new BaseFilter() },
    nests: { global: new BaseFilter() },
    rocket: { global: new BaseFilter() },
  }
  const energyAmounts = new Set([
    ...defaults.pokestops.baseMegaEnergyAmounts,
    ...available.pokestops
      .filter((e) => e.startsWith('m'))
      .map((e) => e.split('-')[1]),
  ])

  for (const [i, pkmn] of Object.entries(Event.masterfile.pokemon)) {
    for (const j of Object.keys(pkmn.forms)) {
      pokemon.full[`${i}-${j}`] = base
      pokemon.raids[`${i}-${j}`] = new BaseFilter(defaults.gyms.pokemon)
      pokemon.quests[`${i}-${j}`] = new BaseFilter(defaults.pokestops.pokemon)
      if (map.enableConfirmedInvasions) {
        pokemon.rocket[`a${i}-${j}`] = new BaseFilter(
          defaults.pokestops.invasionPokemon,
        )
      }
      pokemon.nests[`${i}-${j}`] = new BaseFilter(defaults.nests.allPokemon)
    }
    if (pkmn.family == i) {
      pokemon.quests[`c${pkmn.family}`] = new BaseFilter(
        defaults.pokestops.candy,
      )
      pokemon.quests[`x${pkmn.family}`] = new BaseFilter(
        defaults.pokestops.candy,
      )
    }
    if (pkmn.tempEvolutions) {
      energyAmounts.forEach((a) => {
        pokemon.quests[`m${i}-${a}`] = new BaseFilter(
          defaults.pokestops.megaEnergy,
        )
      })
    }
  }
  return pokemon
}
