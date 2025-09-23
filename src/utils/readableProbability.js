// @ts-check
import * as React from 'react'

/**
 * Converts a numeric probability into a more human-readable format by
 * choosing between a rounded percentage or a simplified fractional odds
 * representation.
 *
 * @param {number} x The raw probability value (e.g., 0.25).
 * @returns {React.ReactNode} Either a percentage string, an odds fragment,
 * or a '🚫' emoji when the probability is zero or negative.
 */
export const readableProbability = (x) => {
  if (x <= 0) return '🚫'
  const roundedOdds = Math.round(1 / x)
  const percent = Math.round(x * 100)
  return Math.abs(1 / roundedOdds - x) < Math.abs(percent * 0.01 - x)
    ? React.createElement(React.Fragment, null, '1/', roundedOdds)
    : `${percent}%`
}
