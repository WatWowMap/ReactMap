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

    /** @type {number} */
    this._intervalHours = intervalHours || 0
    /** @type {Date} */
    this._date = this.#getJsDate(dateObj)
    /** @type {NodeJS.Timeout | null} */
    this._timer = null

    this.generator = this.dateGenerator()

    if (this._date.getTime() < Date.now() && this._intervalHours > 0) {
      this.log.warn(
        'date is in the past (',
        this._date,
        ') and interval hours are greater than 0, the date will fast forward to the next valid time!',
      )
      while (this._date.getTime() < Date.now()) {
        const nextDate = this.generator.next().value
        if (!nextDate) {
          this.log.error('could not find the next valid date')
          break
        }
        this._date = nextDate
        this.log.debug('fast forwarded to', this._date)
      }
    }
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

  *dateGenerator() {
    while (true) {
      yield new Date(
        this._date.getTime() + this._intervalHours * 60 * 60 * 1000,
      )
    }
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
      if (this._intervalHours) {
        const nextDate = this.generator.next().value
        if (nextDate instanceof Date) {
          this._date = nextDate
          this.log.info('setting the next interval for', this._date)
        }
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
