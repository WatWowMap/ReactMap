// @ts-check

export const MAX_TIMER_DELAY_MS = 2_147_483_000

/**
 * @param {number} delay
 * @returns {number}
 */
function normalizeDelay(delay) {
  return Number.isFinite(delay) ? Math.max(0, delay) : 0
}

/**
 * Schedule a timeout, chunking delays that exceed the browser timer limit.
 *
 * @param {() => void} callback
 * @param {number} delay
 * @returns {() => void}
 */
export function setLongTimeout(callback, delay) {
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
