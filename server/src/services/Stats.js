// @ts-check
const NodeCache = require('node-cache')

const { Logger } = require('@rm/logger')
const config = require('@rm/config')

const { getCache } = require('./cache')

/**
 * @typedef {{ count: number, timestamp: number, category: string }} UserApiEntry
 * @typedef {{ coordinates: number, requests: number }} ScanHistory
 */

class Stats extends Logger {
  static dateFormatter = new Intl.DateTimeFormat()

  #alertCache = new NodeCache({ stdTTL: 60 })
  #apolloCache = new NodeCache({ stdTTL: 60 })
  #scanCache = new NodeCache({ stdTTL: 60 * 60 * 24 })

  /** @type {Map<number, UserApiEntry[]>} */
  #apiCache = new Map()

  /**
   * Super class for managing various user stats and caches
   */
  constructor() {
    super('stats')

    Object.entries(getCache('scanUserHistory.json', {})).forEach(([k, v]) =>
      this.#scanCache.set(k, v),
    )
    Object.entries(getCache('userDataLimitCache.json', {})).forEach(
      ([k, v]) => {
        if (+k) this.#apiCache.set(+k, v)
      },
    )
    this.log.info('initialized')
    this.log.info('api cache loaded:', this.#apiCache.size)
    this.log.info('scan cache loaded:', this.#scanCache.keys().length)
  }

  /**
   * Get all valid api entries for a user, excludes expired entries.
   * Optionally filters by category if specified.
   * @param {number} [userId]
   * @param {string} [category]
   * @returns {UserApiEntry[]}
   */
  getValidApiEntries(userId, category) {
    if (!userId) return []

    const now = Date.now()
    const validMs = config.getSafe('api.dataRequestLimits.time') * 1000
    const entries = this.#apiCache.get(userId) || []

    return entries.filter(
      (entry) =>
        now - entry.timestamp <= validMs &&
        (!category || entry.category === category),
    )
  }

  /**
   * Append a new entry to the user's api cache
   * @param {number} userId
   * @param {string} category
   * @param {number} count
   */
  pushApiEntry(userId, category, count) {
    const entries = this.getValidApiEntries(userId)
    entries.push({ count, timestamp: Date.now(), category })
    this.#apiCache.set(userId, entries)
  }

  /**
   * Get the scan history entry for a user
   * @param {number} id
   * @returns {ScanHistory}
   */
  getScanHistory(id) {
    return this.#scanCache.has(id)
      ? this.#scanCache.get(id)
      : { coordinates: 0, requests: 0 }
  }

  /**
   * Set the scan history entry for a user
   * @param {number} id
   * @param {number} coordinates
   * @param {number} [requests]
   */
  setScanHistory(id, coordinates, requests = 1) {
    const existing = this.getScanHistory(id)
    this.#scanCache.set(id, {
      coordinates: existing.coordinates + coordinates,
      requests: existing.requests + requests,
    })
  }

  /**
   * Check if a user has an alert entry
   * @param {number} userId
   */
  hasAlertEntry(userId) {
    return this.#alertCache.has(userId)
  }

  /**
   * Delete an alert entry if it exists
   * @param {number} userId
   */
  delAlertEntry(userId) {
    if (this.#alertCache.has(userId)) {
      this.#alertCache.del(userId)
    }
  }

  /**
   * Set an alert entry for a user
   * @param {number} userId
   */
  setAlertEntry(userId) {
    this.#alertCache.set(userId, true)
  }

  /**
   * Check if a user has an apollo error log entry
   * @param {string} key
   * @returns {boolean}
   */
  hasApolloEntry(key) {
    return this.#apolloCache.has(key)
  }

  /**
   * Set an apollo error log entry for a user
   * @param {string} key
   */
  setApolloEntry(key) {
    this.#apolloCache.set(key, true)
  }

  /**
   * Serialize the api cache to a json object
   */
  serializeApiCache() {
    const userRequestCacheObj =
      /** @type {Record<number, UserApiEntry[]>} */ ({})
    this.#apiCache.forEach((v, k) => {
      userRequestCacheObj[k] = v
    })
    return userRequestCacheObj
  }

  /**
   * Serialize the scan cache to a json object
   */
  serializeScanCache() {
    const cacheObj = {}
    this.#scanCache.keys().forEach((key) => {
      cacheObj[key] = this.#scanCache.get(key)
    })
    return cacheObj
  }
}

module.exports = { Stats }
