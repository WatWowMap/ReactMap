// @ts-check

const MAX_TIMER_DELAY_MS = 2_147_483_000

/**
 * @param {number} delay
 * @returns {number}
 */
function normalizeDelay(delay) {
  return Number.isFinite(delay) ? Math.max(0, delay) : 0
}

/**
 * @param {() => any | Promise<any>} callback
 * @param {number} delay
 * @returns {() => void}
 */
function setLongTimeout(callback, delay) {
  const safeDelay = normalizeDelay(delay)
  if (safeDelay <= MAX_TIMER_DELAY_MS) {
    const timeout = setTimeout(callback, safeDelay)
    return () => clearTimeout(timeout)
  }

  const target = Date.now() + safeDelay
  let timeout

  const schedule = () => {
    const remaining = target - Date.now()
    timeout = setTimeout(
      remaining <= MAX_TIMER_DELAY_MS ? callback : schedule,
      Math.min(Math.max(remaining, 0), MAX_TIMER_DELAY_MS),
    )
  }

  schedule()
  return () => clearTimeout(timeout)
}

/**
 * @param {() => any | Promise<any>} callback
 * @param {number} delay
 * @returns {() => void}
 */
function setLongInterval(callback, delay) {
  const safeDelay = normalizeDelay(delay)
  if (safeDelay <= MAX_TIMER_DELAY_MS) {
    const interval = setInterval(callback, safeDelay)
    return () => clearInterval(interval)
  }

  let active = true
  let cancelTimeout = null

  const schedule = () => {
    cancelTimeout = setLongTimeout(async () => {
      try {
        await callback()
      } finally {
        if (active) schedule()
      }
    }, safeDelay)
  }

  schedule()
  return () => {
    active = false
    if (cancelTimeout) cancelTimeout()
  }
}

module.exports = {
  MAX_TIMER_DELAY_MS,
  setLongInterval,
  setLongTimeout,
}
