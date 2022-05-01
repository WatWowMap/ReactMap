/* eslint-disable no-restricted-syntax */
const { Event } = require('../initialization')
const { GenericFilter } = require('../../models/index')

module.exports = function buildPokemon(defaults, base, custom, available) {
  const pokemon = {
    full: { global: custom },
    raids: { global: new GenericFilter() },
    quests: { global: new GenericFilter() },
    nests: { global: new GenericFilter() },
  }
  const energyAmounts = new Set(['10', '20', ...available.pokestops
    .filter((e) => e.startsWith('m'))
    .map((e) => e.split('-')[1])])

  for (const [i, pkmn] of Object.entries(Event.masterfile.pokemon)) {
    for (const j of Object.keys(pkmn.forms)) {
      pokemon.full[`${i}-${j}`] = base
      pokemon.raids[`${i}-${j}`] = new GenericFilter(defaults.gyms.pokemon)
      pokemon.quests[`${i}-${j}`] = new GenericFilter(defaults.pokestops.pokemon)
      pokemon.nests[`${i}-${j}`] = new GenericFilter(defaults.nests.allPokemon)
    }
    if (pkmn.family == i) {
      pokemon.quests[`c${pkmn.family}`] = new GenericFilter(defaults.pokestops.candy)
      pokemon.quests[`x${pkmn.family}`] = new GenericFilter(defaults.pokestops.candy)
    }
    if (pkmn.tempEvolutions) {
      energyAmounts.forEach((a) => {
        pokemon.quests[`m${i}-${a}`] = new GenericFilter(defaults.pokestops.megaEnergy)
      })
    }
  }
  return pokemon
}
