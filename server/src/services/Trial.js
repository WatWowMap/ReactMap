// @ts-check
const { Logger } = require('@rm/logger')

const { Timer } = require('./Timer')
const state = require('./state')

class Trial extends Logger {
  /** @param {import("@rm/types").StrategyConfig} strategy  */
  constructor(strategy) {
    super(strategy.type, strategy.name, 'trial')

    this._name = strategy.name
    this._type = strategy.type
    this._trial = strategy.trialPeriod
    this._startTimer = new Timer(
      this._trial.start,
      this._trial.intervalHours,
      strategy.type,
      strategy.name,
      'trial',
      'start',
    )
    this._endTimer = new Timer(
      this._trial.end,
      this._trial.intervalHours,
      strategy.type,
      strategy.name,
      'trial',
      'end',
    )

    this._forceActive = false

    if (strategy.enabled) this.start()
  }

  /**
   * Update the trial period dates
   * @param {import("@rm/types").TrialPeriodDate} dateObj
   * @param {boolean} start
   */
  #update(dateObj, start) {
    if (start) {
      this._startTimer.setJsDate(dateObj)
    } else {
      this._endTimer.setJsDate(dateObj)
    }
  }

  #getClearFn(start = false) {
    return async () => {
      this.log.info('is', start ? 'starting' : 'ending')
      await state.db.models.Session.clearNonDonor(this._name)
    }
  }

  get startingIn() {
    return this._startTimer.ms
  }

  get endingIn() {
    return this._endTimer.ms
  }

  active() {
    return (
      this._forceActive || this._startTimer.active() || this._endTimer.active()
    )
  }

  start() {
    if (this._endTimer.ms > 0) {
      const started = this._startTimer.activate(this.#getClearFn(true))
      if (started) {
        this.log.info('starting in', this._startTimer.minutes, 'minutes')
      }
      const ended = this._endTimer.activate(this.#getClearFn())
      if (ended) {
        this.log.info('ending in', this._endTimer.minutes, 'minutes')
      }
    }
  }

  end() {
    this._startTimer.clear()
    this._endTimer.clear()
  }

  /**
   * Set the trial start date
   * @param {import("@rm/types").TrialPeriodDate} dateObj
   */
  setStart(dateObj) {
    this.#update(dateObj, true)
  }

  /**
   * Set the trial end date
   * @param {import("@rm/types").TrialPeriodDate} dateObj
   */
  setEnd(dateObj) {
    this.#update(dateObj, false)
  }

  /**
   * Force the trial to be active regardless of the dates
   * @param {boolean} force
   */
  setActive(force) {
    this._forceActive = force
    this.log.info('force', force ? 'starting' : 'stopping')
    return this.#getClearFn()()
  }
}

module.exports = { Trial }
