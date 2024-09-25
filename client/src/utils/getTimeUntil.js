// @ts-check
import { formatInterval } from './formatInterval'

/**
 *
 * @param {number} date
 * @param {boolean} [until]
 * @returns
 */
export function getTimeUntil(date, until) {
  return formatInterval(until ? date - Date.now() : Date.now() - date)
}
