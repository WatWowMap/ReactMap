// @ts-check
const { Logger, log } = require('@rm/logger')

const { Timer } = require('./Timer')
const state = require('./state')

class Trial extends Logger {
  /** @param {import("@rm/types").StrategyConfig} strategy  */
  constructor(strategy) {
    super(strategy.type, strategy.name, 'trial')

    this._name = strategy.name
    this._type = strategy.type
    this._trial = strategy.trialPeriod

    this._forceActive = false

    let startDate = Trial.getJsDate(this._trial.start)
    let endDate = Trial.getJsDate(this._trial.end)

    if (this._trial.intervalHours > 0) {
      if (startDate.getTime() < Date.now() && endDate.getTime() < Date.now()) {
        this.log.warn(
          'start and end date are in the past (',
          startDate,
          ') and interval hours are greater than 0 (',
          this._trial.intervalHours,
          '), the start and end dates will fast forward to the next valid time!',
        )
      }
      const diff = endDate.getTime() - startDate.getTime()
      while (
        startDate.getTime() < Date.now() &&
        endDate.getTime() < Date.now()
      ) {
        startDate = new Date(
          startDate.getTime() + this._trial.intervalHours * 60 * 60 * 1000,
        )
        endDate = new Date(startDate.getTime() + diff)
        this.log.debug('next start:', startDate, 'next end:', endDate)
      }
      this.log.info('next start:', startDate, 'next end:', endDate)
    }

    const now = Date.now()
    this._active = startDate.getTime() < now && endDate.getTime() > now
    if (this._active) {
      this.log.info('found active trial')
    }
    this._startTimer = new Timer(
      startDate,
      this._trial.intervalHours,
      this._type,
      this._name,
      'trial',
      'start',
    )
    this._endTimer = new Timer(
      endDate,
      this._trial.intervalHours,
      this._type,
      this._name,
      'trial',
      'end',
    )

    if (this._startTimer._date > this._endTimer._date) {
      this.log.warn(
        'start date is greater than end date, the trial will not behave as expected',
      )
    }

    if (strategy.enabled) this.start()
  }

  /**
   * Get a JavaScript Date object from a @see TrialPeriodDate object
   *
   * @param {import("@rm/types").TrialPeriodDate} dateObj
   * @returns {Date}
   */
  static getJsDate(dateObj) {
    if (!dateObj) {
      log.debug('date object is null')
      return new Date(0)
    }
    if (!dateObj.year || !dateObj.month || !dateObj.day) {
      log.debug('date object is missing required fields')
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

  #getClearFn(start = false) {
    return async () => {
      this.log.info('is', start ? 'starting' : 'ending')
      await state.db.models.Session.clearNonDonor(this._name)
      this._active = start
    }
  }

  get startingIn() {
    return this._startTimer.ms
  }

  get endingIn() {
    return this._endTimer.ms
  }

  active() {
    return this._forceActive || this._active
  }

  status() {
    const now = Date.now()
    return {
      active: this.active(),
      start: {
        raw: now + this._startTimer.ms,
        date: this._startTimer._date.toISOString(),
        relative: this._startTimer.relative(),
      },
      end: {
        raw: now + this._endTimer.ms,
        date: this._endTimer._date.toISOString(),
        relative: this._endTimer.relative(),
      },
    }
  }

  start() {
    if (this._endTimer.ms > 0) {
      this._startTimer.activate(this.#getClearFn(true))
      this._endTimer.activate(this.#getClearFn())
    }
  }

  end() {
    this._startTimer.clear()
    this._endTimer.clear()
  }

  async cleanup() {
    if (!this.active()) {
      const result = await state.db.models.Session.clearTrial(this._name)
      if (result > 0) {
        this.log.info('cleaned up', result, 'sessions')
      }
    }
  }

  /**
   * Force the trial to be active regardless of the dates
   * @param {boolean} force
   */
  setActive(force) {
    this._forceActive = force
    this.log.info('force', force ? 'starting' : 'stopping')
    return this.#getClearFn(force)()
  }
}

module.exports = { Trial }
