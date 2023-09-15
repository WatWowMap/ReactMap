// @ts-check
const { find } = require('geo-tz')
const { utcToZonedTime } = require('date-fns-tz')
const { format } = require('date-fns')

const { log, HELPERS } = require('@rm/logger')

/** @typedef {import('@rm/types').Bounds | { lat: number, lon: number }} BoundsEnum */

/**
 * Get the client timezone
 *
 * Accepts either a keyed bbox or a center point.
 * @param {BoundsEnum} bounds
 * @returns {string}
 */
function getClientTimeZone(bounds) {
  const { lat, lon } =
    'lat' in bounds
      ? bounds
      : {
          lat: (bounds.minLat + bounds.maxLat) / 2,
          lon: (bounds.minLon + bounds.maxLon) / 2,
        }
  const timezone = find(lat, lon)[0]
  log.debug(HELPERS.client, `timezone: ${timezone}`)
  return timezone
}

/**
 * Get the client's local time
 *
 * Accepts either a keyed bbox or a center point.
 * @param {BoundsEnum} bounds
 * @param {string} [timeZone]
 * @returns {Date}
 */
function getClientDate(bounds, timeZone = getClientTimeZone(bounds)) {
  const utcDate = new Date()
  const clientDate = utcToZonedTime(utcDate, timeZone)
  log.debug(
    HELPERS.client,
    `time: ${format(clientDate, 'yyyy-MM-dd HH:mm:ss.SSS')}`,
  )
  return clientDate
}

/**
 * Get the client's midnight, generally for checking quest validity
 * @param {Date} clientDate
 * @param {string} timezone
 * @returns {number}
 */
function getClientMidnight(clientDate, timezone) {
  // const serverMidnight = new Date(
  //   clientDate.getFullYear(),
  //   clientDate.getMonth(),
  //   clientDate.getDate(),
  //   0,
  //   0,
  //   1,
  //   0,
  // )
  // const clientMidnight = utcToZonedTime(serverMidnight, timezone)

  clientDate.setHours(0, 0, 1, 0)

  log.debug(
    HELPERS.client,
    `midnight: ${format(clientDate, 'yyyy-MM-dd HH:mm:ss.SSS')}`,
    `timezone: ${timezone}`,
  )
  return Math.floor(clientDate.getTime() / 1000)
}

/**
 * Returns the client's local time and midnight timestamp.
 *
 * Accepts either a keyed bbox or center point.
 * @param {BoundsEnum} bounds
 * @returns {{ ts: number, midnight: number }}
 */
function getClientTime(bounds) {
  const timeZone = getClientTimeZone(bounds)
  const clientDate = getClientDate(bounds, timeZone)

  return {
    ts: Math.floor(clientDate.getTime() / 1000),
    midnight: getClientMidnight(clientDate, timeZone),
  }
}

module.exports = {
  getClientTimeZone,
  getClientDate,
  getClientMidnight,
  getClientTime,
}
