import getPokemonIcon from './functions/getPokemonIcon'
import getProperName from './functions/getProperName'
import menuFilter from './functions/menuFilter'
import checkAdvFilter from './functions/checkAdvFilter'
import getTimers from './functions/getTimeUntil'
import dayCheck from './functions/dayCheck'
import parseQuestConditions from './functions/parseConditions'

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

  static dayCheck(ts, desiredStamp) {
    return dayCheck(ts, desiredStamp)
  }

  static parseConditions(conditions) {
    return parseQuestConditions(conditions)
  }
}

export default Utility
