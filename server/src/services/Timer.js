// @ts-check
const { Logger } = require('@rm/logger')

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

const UNITS = /** @type {const} */ ([
  { unit: 'second', value: 1 },
  { unit: 'minute', value: 60 },
  { unit: 'hour', value: 3600 },
  { unit: 'day', value: 86400 },
  { unit: 'week', value: 604800 },
  { unit: 'month', value: 2592000 },
  { unit: 'year', value: 31536000 },
])

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

  relative() {
    const seconds = Math.floor(this.ms / 1000)
    for (let i = UNITS.length - 1; i >= 0; i--) {
      const { unit, value } = UNITS[i]
      if (Math.abs(seconds) >= value) {
        const count = Math.floor(seconds / value)
        return rtf.format(count, unit)
      }
    }

    return rtf.format(seconds, 'second')
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
    this.log.info('activating', this.relative())

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
    if (this._timer) {
      this.log.info('clearing timer')
      clearTimeout(this._timer)
    }
    if (this._interval) {
      this.log.info('clearing interval')
      clearInterval(this._interval)
    }
  }
}

module.exports = { Timer }
