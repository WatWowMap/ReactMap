// @ts-check
import SunCalc from 'suncalc'

/**
 *
 * @param {number} lat
 * @param {number} lon
 * @returns
 */
export function timeCheck(lat, lon) {
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
