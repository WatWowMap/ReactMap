// @ts-check
const { Logger } = require('@rm/logger')

class Timer extends Logger {
  /**
   * @param {import("@rm/types").TrialPeriodDate} dateObj
   * @param {number} intervalHours
   * @param {...string} [tags]
   */
  constructor(dateObj, intervalHours, ...tags) {
    super(...(tags.length ? tags : ['timer']))

    this._date = this.#getJsDate(dateObj)
    this.intervalHours = intervalHours
    this._timer = null
  }

  /**
   * Get a JavaScript Date object from a @see TrialPeriodDate object
   *
   * @param {import("@rm/types").TrialPeriodDate} dateObj
   * @returns {Date}
   */
  #getJsDate(dateObj) {
    if (!dateObj) {
      this.log.debug('date object is null')
      return new Date(0)
    }
    if (!dateObj.year || !dateObj.month || !dateObj.day) {
      this.log.debug('date object is missing required fields')
      return new Date(0)
    }
    return new Date(
      dateObj.year,
      dateObj.month - 1,
      dateObj.day,
      dateObj.hour || 0,
      dateObj.minute || 0,
      dateObj.second || 0,
      dateObj.millisecond || 0,
    )
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
   * @param {Date | import("@rm/types").TrialPeriodDate} newDate
   */
  setJsDate(newDate) {
    this._date = newDate instanceof Date ? newDate : this.#getJsDate(newDate)
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
      if (this.intervalHours) {
        this._date = new Date(
          this._date.getTime() + this.intervalHours * 3600000,
        )
        this.activate(cb)
      }
      return cb()
    }, this._date.getTime() - now)
    return true
  }

  async clear() {
    if (this._timer) {
      clearTimeout(this._timer)
    }
  }
}

module.exports = { Timer }
