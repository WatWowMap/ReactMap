import getPokemonIcon from './functions/getPokemonIcon'
import getProperName from './functions/getProperName'
import filterPokemon from './functions/filterPokemon'
import checkAdvFilter from './functions/checkAdvFilter'

class Utility {
  static getPokemonIcon(availableForms, pokemonId, form, evolution, gender, costume, shiny) {
    return getPokemonIcon(availableForms, pokemonId, form, evolution, gender, costume, shiny)
  }

  static getProperName(word) {
    return getProperName(word)
  }

  static pokemon(tempFilters, menus, search) {
    return filterPokemon(tempFilters, menus, search)
  }

  static checkAdvFilter(filter) {
    return checkAdvFilter(filter)
  }
}

export default Utility
