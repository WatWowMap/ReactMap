// @ts-check
const { find } = require('geo-tz')
const { tz } = require('moment-timezone')
const { utcToZonedTime } = require('date-fns-tz')
const { format } = require('date-fns')
const { log, TAGS } = require('@rm/logger')

const { getCenter } = require('./getCenter')

/** @typedef {import('@rm/types').BBox | { lat: number, lon: number }} BoundsEnum */

/**
 *
 * @param {Date} [date]
 * @returns
 */
function getEpoch(date = new Date()) {
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
  const { lat, lon } = getCenter(bounds)
  const timezone = find(lat, lon)

  log.debug(TAGS.client, `timezone: ${timezone}`)

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
    TAGS.client,
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

  const userMidnight = tz(new Date(), userTimeZone).startOf('day')

  log.debug(
    TAGS.client,
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
