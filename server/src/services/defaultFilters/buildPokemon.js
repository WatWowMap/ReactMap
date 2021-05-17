/* eslint-disable no-restricted-syntax */
const masterfile = require('../../data/masterfile.json')
const { PokemonFilter, GenericFilter, Pokemon } = require('../../models/index')

module.exports = async function buildPokemon(perms, type) {
  const pokemon = {}
  const available = await Pokemon.getAvailablePokemon()
  for (const [i, pkmn] of Object.entries(masterfile.pokemon)) {
    for (const j of Object.keys(pkmn.forms)) {
      if (type === 'pokemon') {
        if (available.includes(`${i}-${j}`)) {
          pkmn.forms[j].available = true
        }
        pokemon[`${i}-${j}`] = new PokemonFilter()
      } else if (perms) {
        pokemon[`p${i}-${j}`] = new GenericFilter()
      }
    }
  }
  return pokemon
}
