import formatInterval from './functions/formatInterval'
import getProperName from './functions/getProperName'
import menuFilter from './functions/menuFilter'
import checkAdvFilter from './functions/checkAdvFilter'
import dayCheck from './functions/dayCheck'
import parseQuestConditions from './functions/parseConditions'
import formatter from './functions/formatter'

export default class Utility {
  static getProperName(word) {
    return getProperName(word)
  }

  static menuFilter(tempFilters, menus, search, type) {
    return menuFilter(tempFilters, menus, search, type)
  }

  static checkAdvFilter(filter) {
    return checkAdvFilter(filter)
  }

  static formatInterval(intervalMs) {
    return formatInterval(intervalMs)
  }

  static getTimeUntil(date, until) {
    return formatInterval(until ? date - Date.now() : Date.now() - date)
  }

  static dayCheck(ts, desiredStamp) {
    return dayCheck(ts, desiredStamp)
  }

  static parseConditions(conditions) {
    return parseQuestConditions(conditions)
  }

  static formatter(addressFormat, data) {
    return formatter(addressFormat, data)
  }
}
