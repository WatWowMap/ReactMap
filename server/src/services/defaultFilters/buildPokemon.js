/* eslint-disable no-restricted-syntax */
const masterfile = require('../../data/masterfile.json')
const { GenericFilter } = require('../../models/index')

module.exports = function buildPokemon(defaults, base, custom) {
  const pokemon = {
    full: { global: custom },
    raids: { global: new GenericFilter() },
    quests: { global: new GenericFilter() },
    nests: { global: new GenericFilter() },
  }
  const evolutions = []
  for (const [i, pkmn] of Object.entries(masterfile.pokemon)) {
    for (const j of Object.keys(pkmn.forms)) {
      pokemon.full[`${i}-${j}`] = base
      pokemon.raids[`${i}-${j}`] = new GenericFilter(defaults.gyms.pokemon)
      pokemon.quests[`${i}-${j}`] = new GenericFilter(defaults.pokestops.pokemon)
      pokemon.nests[`${i}-${j}`] = new GenericFilter(defaults.nests.allPokemon)
    }
    if (!evolutions.includes(parseInt(i))) {
      evolutions.push(parseInt(i))
      if (pkmn.evolutions) {
        pkmn.evolutions.forEach(evo => {
          evolutions.push(evo.pokemon)
          const secondStage = masterfile.pokemon[evo.pokemon]
          if (secondStage.evolutions) {
            secondStage.evolutions.forEach(evo2 => evolutions.push(evo2.pokemon))
          }
          evolutions.push(masterfile.pokemon)
        })
      }
      pokemon.quests[`c${i}`] = new GenericFilter(defaults.pokestops.pokemon)
    }
    if (pkmn.temp_evolutions) {
      pokemon.quests[`m${i}-10`] = new GenericFilter(defaults.pokestops.megaEnergy)
      pokemon.quests[`m${i}-20`] = new GenericFilter(defaults.pokestops.megaEnergy)
    }
  }
  return pokemon
}
