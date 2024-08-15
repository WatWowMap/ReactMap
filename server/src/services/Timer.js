// @ts-check
const { Logger } = require('@rm/logger')

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

const UNITS = /** @type {const} */ ([
  { unit: 'year', value: 31536000 },
  { unit: 'month', value: 2592000 },
  { unit: 'week', value: 604800 },
  { unit: 'day', value: 86400 },
  { unit: 'hour', value: 3600 },
  { unit: 'minute', value: 60 },
  { unit: 'second', value: 1 },
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
    this._intervalMs = (intervalHours || 0) * 60 * 60 * 1000
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
    let seconds = Math.floor(this.ms / 1000)
    const isNegative = seconds < 0
    seconds = Math.abs(seconds)
    const result = []

    for (let i = 0; i < UNITS.length; i++) {
      const { unit, value } = UNITS[i]
      const count = Math.floor(seconds / value)
      if (count > 0) {
        result.push(rtf.format(isNegative ? -count : count, unit))
        seconds -= count * value
      }
    }

    return result.length > 1
      ? `${result
          .slice(0, -1)
          .map((r, i) => {
            if (i === 0) return r
            const [, ...n] = r.split(' ')
            return n.join(' ')
          })
          .join(', ')} and ${result[result.length - 1].replaceAll('in ', '')}`
      : result[0]
  }

  setNextDate() {
    this._date = new Date(this._date.getTime() + this._intervalMs)
    this.log.info('next', this.relative())
  }

  /**
   * @param {() => any | Promise<any>} cb
   */
  setInterval(cb) {
    if (this._intervalMs > 0) {
      this.setNextDate()
      this._interval = setInterval(async () => {
        await cb()
        this.setNextDate()
      }, this._intervalMs)
    }
  }

  /**
   * @param {() => any | Promise<any>} cb
   */
  activate(cb) {
    const now = Date.now()
    this.clear()

    if (now >= this._date.getTime()) {
      this.setInterval(cb)
      return true
    }
    this.log.info(this.relative())

    this._timer = setTimeout(async () => {
      await cb()
      this.setInterval(cb)
    }, this._date.getTime() - now)

    return false
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
