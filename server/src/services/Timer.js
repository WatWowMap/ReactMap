// @ts-check
const { Logger } = require('@rm/logger')

class Timer extends Logger {
  /**
   * @param {Date} date
   * @param {number} intervalHours
   * @param {...string} [tags]
   */
  constructor(date, intervalHours, ...tags) {
    super(...(tags.length ? tags : ['timer']))

    /** @type {number} */
    this._intervalHours = intervalHours || 0
    /** @type {Date} */
    this._date = date
    /** @type {NodeJS.Timeout | null} */
    this._timer = null
    /** @type {NodeJS.Timeout | null} */
    this._interval = null
  }

  get ms() {
    return this._date.getTime() - Date.now()
  }

  get minutes() {
    return +(this.ms / 60000).toFixed(2)
  }

  active() {
    return this._timer !== null && this.ms > 0
  }

  /**
   * Set when the timer should start
   * @param {Date} newDate
   */
  setJsDate(newDate) {
    this._date = newDate
  }

  /**
   * @param {() => any | Promise<any>} cb
   * @returns {boolean}
   */
  activate(cb) {
    const now = Date.now()
    if (now >= this._date.getTime()) {
      this.log.info('date is in the past - not activating')
      return false
    }
    this.clear()
    this.log.info('activating at', this._date)

    this._timer = setTimeout(() => {
      if (this._intervalHours > 0) {
        this._interval = setInterval(
          () => cb(),
          this._intervalHours * 60 * 60 * 1000,
        )
      }
      return cb()
    }, this._date.getTime() - now)

    return true
  }

  async clear() {
    this.log.info('clearing timer')
    if (this._timer) {
      clearTimeout(this._timer)
    }
    if (this._interval) {
      clearInterval(this._interval)
    }
  }
}

module.exports = { Timer }
