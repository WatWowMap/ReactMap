import getPokemonIcon from './functions/getPokemonIcon'
import getProperName from './functions/getProperName'
import filterPokemon from './functions/filterPokemon'
import checkAdvFilter from './functions/checkAdvFilter'
import filterGyms from './functions/filterGyms'
import filterPokestops from './functions/filterPokestops'
import getTimers from './functions/getTimeUntil'

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

  static gyms(tempFilters, menus, search) {
    return filterGyms(tempFilters, menus, search)
  }

  static pokestops(tempFilters, menus, search) {
    return filterPokestops(tempFilters, menus, search)
  }

  static checkAdvFilter(filter) {
    return checkAdvFilter(filter)
  }

  static getTimeUntil(date, until) {
    return getTimers(date, until)
  }
}

export default Utility
