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
   * @param {string} [timezone]
   * @param {...string} [tags]
   */
  constructor(date, intervalHours, timezone, ...tags) {
    super(...(tags.length ? tags : ['timer']))

    /** @type {number} */
    this._intervalHours = intervalHours || 0
    /** @type {number} */
    this._intervalMs = this._intervalHours * 60 * 60 * 1000
    /** @type {string | undefined} */
    this._timezone = timezone || undefined
    /** @type {Date} */
    this._date = date

    /** @type {NodeJS.Timeout | null} */
    this._timer = null
    /** @type {NodeJS.Timeout | null} */
    this._interval = null
    /** @type {boolean} */
    this._stopped = false
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
    if (this._timezone) {
      this._date = Timer.advanceInTimezone(
        this._date,
        this._intervalHours,
        this._timezone,
      )
    } else {
      this._date = new Date(this._date.getTime() + this._intervalMs)
    }
    this.log.info('next', this.relative())
  }

  /**
   * Convert local date/time components in a timezone to a UTC Date.
   * Uses only Date.UTC and Intl.DateTimeFormat to avoid host-timezone
   * interference (no `new Date(y,m,d,h,…)` which normalises through
   * the server's local DST rules).
   *
   * @param {number} year
   * @param {number} month 0-indexed
   * @param {number} day
   * @param {number} hour may overflow/underflow (Date.UTC normalises)
   * @param {number} minute
   * @param {number} second
   * @param {string} timezone IANA timezone identifier
   * @returns {Date}
   */
  static localToUtc(year, month, day, hour, minute, second, timezone) {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hourCycle: 'h23',
    })
    const getOffset = (ms) => {
      const parts = fmt.formatToParts(new Date(ms))
      const get = (type) =>
        parseInt(parts.find((p) => p.type === type).value, 10)
      return (
        Date.UTC(
          get('year'),
          get('month') - 1,
          get('day'),
          get('hour'),
          get('minute'),
          get('second'),
        ) - ms
      )
    }

    const utcMs = Date.UTC(year, month, day, hour, minute, second)
    const offset = getOffset(utcMs)
    const result = utcMs - offset

    // Re-check: if utcMs and result straddle a DST boundary the offset
    // at the result may differ from the initial guess.
    const offset2 = getOffset(result)
    if (offset !== offset2) {
      return new Date(utcMs - offset2)
    }
    return new Date(result)
  }

  /**
   * Advance a UTC date by the given hours while preserving local time
   * in the target timezone across DST transitions.
   *
   * @param {Date} utcDate
   * @param {number} hours
   * @param {string} timezone IANA timezone identifier
   * @returns {Date}
   */
  static advanceInTimezone(utcDate, hours, timezone) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hourCycle: 'h23',
    }).formatToParts(utcDate)
    const get = (type) =>
      parseInt(parts.find((p) => p.type === type).value, 10)

    return Timer.localToUtc(
      get('year'),
      get('month') - 1,
      get('day'),
      get('hour') + hours,
      get('minute'),
      get('second'),
      timezone,
    )
  }

  /**
   * @param {() => any | Promise<any>} cb
   */
  setInterval(cb) {
    if (this._intervalMs > 0) {
      this.setNextDate()
      if (this._timezone) {
        const scheduleNext = () => {
          if (this._stopped) return
          const delay = Math.max(0, this._date.getTime() - Date.now())
          this._interval = setTimeout(async () => {
            await cb()
            if (this._stopped) return
            this.setNextDate()
            scheduleNext()
          }, delay)
        }
        scheduleNext()
      } else {
        this._interval = setInterval(async () => {
          await cb()
          this.setNextDate()
        }, this._intervalMs)
      }
    }
  }

  /**
   * @param {() => any | Promise<any>} cb
   */
  activate(cb) {
    const now = Date.now()
    this.clear()
    this._stopped = false

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
    this._stopped = true
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
