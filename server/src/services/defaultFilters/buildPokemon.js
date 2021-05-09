/* eslint-disable no-restricted-syntax */
const masterfile = require('../../data/masterfile.json')
const { PokemonFilter, GenericFilter } = require('../../models/index')

module.exports = function buildPokemon(perms, type) {
  const pokemon = {}
  for (const [i, pkmn] of Object.entries(masterfile.pokemon)) {
    for (const j of Object.keys(pkmn.forms)) {
      if (type === 'pokemon') {
        pokemon[`${i}-${j}`] = new PokemonFilter()
      } else if (perms) {
        pokemon[`p${i}-${j}`] = new GenericFilter()
      }
    }
  }
  return pokemon
}
