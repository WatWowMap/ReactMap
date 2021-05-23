/* eslint-disable no-restricted-syntax */
const masterfile = require('../../data/masterfile.json')
const { PokemonFilter, GenericFilter } = require('../../models/index')

module.exports = function buildPokemon(defaults) {
  const pokemon = {
    full: { ivAnd: new PokemonFilter() },
    raids: { ivAnd: new GenericFilter() },
    quests: { ivAnd: new GenericFilter() },
  }
  for (const [i, pkmn] of Object.entries(masterfile.pokemon)) {
    for (const j of Object.keys(pkmn.forms)) {
      pokemon.full[`${i}-${j}`] = new PokemonFilter()
      pokemon.raids[`${i}-${j}`] = new GenericFilter(defaults.gyms.pokemon)
      pokemon.quests[`${i}-${j}`] = new GenericFilter(defaults.pokestops.pokemon)
    }
    if (pkmn.temp_evolutions) {
      pokemon.quests[`m${i}-10`] = new GenericFilter(defaults.pokestops.megaEnergy)
      pokemon.quests[`m${i}-20`] = new GenericFilter(defaults.pokestops.megaEnergy)
    }
  }
  return pokemon
}
