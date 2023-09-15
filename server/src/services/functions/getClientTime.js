// @ts-check
const { find } = require('geo-tz')
const { tz } = require('moment-timezone')
const { utcToZonedTime } = require('date-fns-tz')
const { format } = require('date-fns')

const { log, HELPERS } = require('@rm/logger')

/** @typedef {import('@rm/types').Bounds | { lat: number, lon: number }} BoundsEnum */

/**
 *
 * @param {Date} date
 * @returns
 */
function getEpoch(date) {
  return Math.floor(date.getTime() / 1000)
}

/**
 * Get the client timezone
 *
 * Accepts either a keyed bbox or a center point.
 * @param {BoundsEnum} bounds
 * @returns {string}
 */
function getUserTimeZone(bounds) {
  const { lat, lon } =
    'lat' in bounds
      ? bounds
      : {
          lat: (bounds.minLat + bounds.maxLat) / 2,
          lon: (bounds.minLon + bounds.maxLon) / 2,
        }
  const timezone = find(lat, lon)
  log.debug(HELPERS.client, `timezone: ${timezone}`)
  return timezone[0]
}

/**
 * Get the client's local time
 *
 * Accepts either a keyed bbox or a center point.
 * @param {BoundsEnum | string} boundsOrTimezone
 * @returns {Date}
 */
function getUserDate(boundsOrTimezone) {
  const timezone =
    typeof boundsOrTimezone === 'string'
      ? boundsOrTimezone
      : getUserTimeZone(boundsOrTimezone)
  const utcDate = new Date()
  const clientDate = utcToZonedTime(utcDate, timezone)
  log.debug(
    HELPERS.client,
    `time: ${format(clientDate, 'yyyy-MM-dd HH:mm:ss.SSS')}`,
    getEpoch(clientDate),
  )
  return clientDate
}

/**
 * Returns the client's local time and midnight timestamp.
 *
 * Accepts either a keyed bbox or center point.
 * @param {BoundsEnum} bounds
 * @returns {number}
 */
function getUserMidnight(bounds) {
  const userTimeZone = getUserTimeZone(bounds)
  const userDate = getUserDate(bounds)

  const userMidnight = tz(userDate, userTimeZone).startOf('day')
  log.debug(
    HELPERS.client,
    `midnight: ${userMidnight.format('yyyy-MM-DD HH:mm:ss.SSS')}`,
    userMidnight.unix(),
  )
  return userMidnight.unix()
}

module.exports = {
  getEpoch,
  getUserTimeZone,
  getUserDate,
  getUserMidnight,
}
