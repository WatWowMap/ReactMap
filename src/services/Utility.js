import ReactGA from 'react-ga4'
import SunCalc from 'suncalc'

import formatInterval from '@utils/formatInterval'
import getProperName from '@utils/getProperName'
import checkAdvFilter from '@utils/checkAdvFilter'
import dayCheck from '@utils/dayCheck'
import parseQuestConditions from '@utils/parseConditions'

export default class Utility {
  static getProperName(word) {
    return getProperName(word)
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

  static camelToSnake(str) {
    return str.replace(/([a-z](?=[A-Z]))/g, '$1_').toLowerCase()
  }

  static capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  static getTileBackground(columnIndex, rowIndex) {
    return columnIndex % 2
      ? rowIndex % 2 === 0
        ? 'rgba(1, 1, 1, 0.01)'
        : 'rgba(240, 240, 240, 0.01)'
      : rowIndex % 2
      ? 'rgba(1, 1, 1, 0.01)'
      : 'rgba(240, 240, 240, 0.01)'
  }

  static generateSlots = (teamId, show, tempFilters) => {
    const slotObj = {}
    for (let i = 1; i <= 6; i += 1) {
      const slotKey = `g${teamId.charAt(1)}-${i}`
      slotObj[slotKey] =
        typeof show === 'boolean'
          ? { ...tempFilters[slotKey], enabled: show }
          : { ...tempFilters[slotKey], size: show.size }
    }
    return slotObj
  }

  static timeCheck(lat, lon) {
    const date = new Date()
    const times = SunCalc.getTimes(date, lat, lon)
    switch (true) {
      case date > times.dawn && date < times.sunriseEnd:
        return 'dawn'
      case date > times.dusk && date < times.night:
        return 'dusk'
      case date > times.night || date < times.nightEnd:
        return 'night'
      default:
        return 'day'
    }
  }

  static analytics(category, action = '', label = '', nonInteraction = false) {
    if (CONFIG.googleAnalyticsId) {
      if (action) {
        ReactGA.event({
          category,
          action,
          label,
          nonInteraction,
        })
      } else {
        ReactGA.pageview(category)
      }
    }
  }

  /**
   * @param {Record<string, number>} sizeObj
   */
  static getSizes = (sizeObj) => ({
    xs: sizeObj?.xs || 12,
    sm: sizeObj?.sm || sizeObj?.xs || 12,
    md: sizeObj?.md || sizeObj?.sm || sizeObj?.xs || 12,
    lg: sizeObj?.lg || sizeObj?.md || sizeObj?.sm || sizeObj?.xs || 12,
    xl:
      sizeObj?.xl ||
      sizeObj?.lg ||
      sizeObj?.md ||
      sizeObj?.sm ||
      sizeObj?.xs ||
      12,
  })

  /**
   * Provides the raw content or translated content if available
   * @param {string | Record<string, string>} content
   * @returns
   */
  static getBlockContent(content) {
    if (!content) return ''
    if (typeof content === 'string') return content
    return typeof content === 'object'
      ? content[localStorage.getItem('i18nextLng')] || Object.values(content)[0]
      : ''
  }
}
