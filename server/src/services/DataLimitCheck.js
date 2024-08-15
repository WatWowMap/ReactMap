// @ts-check
const config = require('@rm/config')
const { Logger } = require('@rm/logger')

const state = require('./state')

class DataLimitCheck extends Logger {
  /**
   * Utility class for checking data limits for a user
   * @param {import('express').Request} req
   */
  constructor(req) {
    const category = DataLimitCheck.getCategory(req)
    super(category)

    this.user = req.user
    this.category = category

    if (!req.user) return

    this.limit = DataLimitCheck.getLimit(this.category)
    this.entries = state.stats.getValidApiEntries(this.user.id, this.category)
    this.totalCount = this.entries.reduce((a, b) => a + b.count, 0)
    this.until = DataLimitCheck.getUntil(this.entries)

    if (this.category !== 'unknown') {
      this.log.debug(
        this.user.username,
        '| current count:',
        this.totalCount,
        '| config limit:',
        this.limit,
      )
    }
  }

  /**
   * Parses a gql request body for a category
   * @param {import('express').Request} req
   */
  static getCategory(req) {
    let category =
      req.body?.query?.split(' on ')[1]?.split(' ')[0]?.toLowerCase() ||
      'unknown'
    if (
      category !== 'pokemon' &&
      category !== 'weather' &&
      category !== 'unknown' &&
      category !== 'search'
    ) {
      category += 's'
    }
    return category
  }

  /**
   * Gets the limit from the config for a category
   * @param {string} category
   * @returns {number}
   */
  static getLimit(category) {
    const requestLimits = config.getSafe('api.dataRequestLimits.categories')
    return category in requestLimits && requestLimits[category] > 0
      ? requestLimits[category]
      : Infinity
  }

  /**
   * Gets the rolling time until the next request can be made
   * @param {import('./Stats').UserApiEntry[]} entries
   * @returns {number}
   */
  static getUntil(entries) {
    return entries.length > 0
      ? entries[0].timestamp +
          config.getSafe('api.dataRequestLimits.time') * 1000
      : 0
  }

  /**
   * Checks if the user has exceeded the limit
   * @returns {Promise<boolean>}
   */
  async isOverLimit() {
    if (!this.user) return false

    const result = this.totalCount > this.limit
    if (result) {
      await this.#clientAlert()
    } else {
      state.stats.delAlertEntry(this.user.id)
    }
    return result
  }

  /**
   * Sends an alert to the user's strategy client
   */
  async #clientAlert() {
    if (!state.stats.hasAlertEntry(this.user.id)) {
      await state.event.chatLog('main', {
        title: `Data Limit Reached`,
        author: {
          name: this.user.username,
          icon_url: `https://cdn.discordapp.com/avatars/${this.user.discordId}/${this.user.avatar}.png`,
        },
        description: `Has reached the data limit for ${
          this.category
        } requests (${this.totalCount}/${
          this.limit
        }). They will be able to make requests again <t:${Math.ceil(
          this.until / 1000,
        )}:R> (${new Date(this.until).toLocaleTimeString()})`,
      })
      state.stats.setAlertEntry(this.user.id)
    }
  }
}

module.exports = { DataLimitCheck }
