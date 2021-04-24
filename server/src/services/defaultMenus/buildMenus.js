const buildPokemonMenu = require('./buildPokemonMenu')

module.exports = function buildMenus() {
  return {
    pokemon: buildPokemonMenu(),
  }
}
