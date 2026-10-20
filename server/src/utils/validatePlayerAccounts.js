// @ts-check

/** Golbat refuses longer player ids */
const MAX_ID_BYTES = 256
const MAX_LABEL_LENGTH = 24
const FRIEND_CODE = /^\d{12}$/

/**
 * Checks the player accounts a user saves, filling in the default labels
 * @param {unknown} input
 * @param {number} max how many the user may save
 * @returns {{ accounts: import('../models/PlayerAccount').PlayerAccountEntry[], error?: undefined } | { error: string, accounts?: undefined }}
 */
function validatePlayerAccounts(input, max) {
  if (!Array.isArray(input)) return { error: 'invalid_id' }
  if (input.length > max) return { error: 'too_many' }
  const seen = new Set()
  /** @type {import('../models/PlayerAccount').PlayerAccountEntry[]} */
  const accounts = []
  for (let i = 0; i < input.length; i += 1) {
    const playerId = `${input[i]?.playerId ?? ''}`.trim()
    const label = `${input[i]?.label ?? ''}`.trim()
    if (!playerId || Buffer.byteLength(playerId, 'utf8') > MAX_ID_BYTES) {
      return { error: 'invalid_id' }
    }
    if (FRIEND_CODE.test(playerId.replace(/[\s-]/g, ''))) {
      return { error: 'friend_code' }
    }
    if (label.length > MAX_LABEL_LENGTH) return { error: 'label_too_long' }
    if (seen.has(playerId)) return { error: 'duplicate' }
    seen.add(playerId)
    accounts.push({
      playerId,
      label: label || `Player ${i + 1}`,
      active: input[i]?.active !== false,
    })
  }
  return { accounts }
}

module.exports = { validatePlayerAccounts }
