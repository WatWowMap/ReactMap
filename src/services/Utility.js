import getPokemonIcon from './functions/getPokemonIcon'
import getProperName from './functions/getProperName'
import menuFilter from './functions/menuFilter'
import checkAdvFilter from './functions/checkAdvFilter'
import getTimers from './functions/getTimeUntil'

class Utility {
  static getPokemonIcon(availableForms, pokemonId, form, evolution, gender, costume, shiny) {
    return getPokemonIcon(availableForms, pokemonId, form, evolution, gender, costume, shiny)
  }

  static getProperName(word) {
    return getProperName(word)
  }

  static menuFilter(tempFilters, menus, search, type) {
    return menuFilter(tempFilters, menus, search, type)
  }

  static checkAdvFilter(filter) {
    return checkAdvFilter(filter)
  }

  static getTimeUntil(date, until) {
    return getTimers(date, until)
  }
}

export default Utility
