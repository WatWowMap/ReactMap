import getPokemonIcon from './functions/getPokemonIcon'
import getProperName from './functions/getProperName'
import filterPokemon from './functions/filterPokemon'

class Utility {
  static getPokemonIcon(availableForms, pokemonId, form, evolution, gender, costume, shiny) {
    return getPokemonIcon(availableForms, pokemonId, form, evolution, gender, costume, shiny)
  }

  static getProperName(word) {
    return getProperName(word)
  }

  static filterPokemon(tempFilters, filters, search) {
    return filterPokemon(tempFilters, filters, search)
  }
}

export default Utility
