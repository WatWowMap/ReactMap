// @ts-check
const { default: fetch } = require('node-fetch')

const config = require('@rm/config')
const { log, TAGS } = require('@rm/logger')

/**
 * Looks up the player id behind a friend code with a PlayerID service
 * (`api.playerIdLookup`): a ticket is created for the code and a bot of the
 * service finds the id, right away when it is known, otherwise later. Tickets
 * are asked for under `fc-<code>`, so one code is only ever asked for once and
 * every later look is a free read of that ticket.
 */

const TIMEOUT_MS = 10_000
// a pending code is read again at most this often
const RECHECK_MS = 60_000
// a new ticket is read again after this long
const FIRST_READ_MS = 1000
// ticket statuses that ended without a player id
const ENDED = new Set(['not_found', 'expired', 'failed', 'rejected'])
// the name personalShiny.cleanPlayers gives a player saved without one
const DEFAULT_NAME = /^Player \d+$/

/**
 * @typedef {{
 *  status: 'done' | 'pending' | 'failed' | 'limited' | 'off',
 *  playerId?: string,
 *  trainer?: import('./personalShiny').Trainer,
 * }} LookupResult
 */

/** @type {Map<string, LookupResult>} friend code -> what was found */
const found = new Map()
/** @type {Map<string, number>} friend code -> last read */
const lastChecked = new Map()
// after the daily quota is used up nothing is asked for until this time
let limitedUntil = 0
const LIMITED_MS = 60 * 60 * 1000
// lastChecked only matters for RECHECK_MS, so it is pruned past this size
const MAX_CHECKED = 1000

/** @returns {{ url: string, apiKey: string }} */
function getSettings() {
  const settings = config.getSafe('api.playerIdLookup') || {}
  return {
    url: `${settings.url || ''}`.replace(/\/+$/, ''),
    apiKey: `${settings.apiKey || ''}`,
  }
}

/** Whether a lookup service is set up */
function enabled() {
  const { url, apiKey } = getSettings()
  return !!(url && apiKey)
}

/**
 * The 12 digits of a friend code, spaces and dashes allowed in the input.
 * @param {unknown} input
 * @returns {string | null}
 */
function normalizeFriendCode(input) {
  const digits = `${input ?? ''}`.replace(/[\s-]/g, '')
  return /^\d{12}$/.test(digits) ? digits : null
}

/**
 * @param {'GET' | 'POST'} method
 * @param {string} path
 * @param {object} [body]
 * @returns {Promise<{ status: number, json: any }>}
 */
async function request(method, path, body) {
  const { url, apiKey } = getSettings()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const response = await fetch(`${url}${path}`, {
      method,
      headers: {
        'X-Api-Key': apiKey,
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })
    return { status: response.status, json: await response.json() }
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * @param {any} ticket
 * @returns {LookupResult}
 */
function fromTicket(ticket) {
  if (ticket?.status === 'done' && ticket.player_id) {
    return {
      status: 'done',
      playerId: `${ticket.player_id}`,
      trainer: {
        name: ticket.name ? `${ticket.name}` : undefined,
        level: Number.isInteger(ticket.level) ? ticket.level : undefined,
        team: ticket.team || undefined,
      },
    }
  }
  if (ENDED.has(ticket?.status)) return { status: 'failed' }
  return { status: 'pending' }
}

/**
 * The player id behind a friend code. A code that was never asked for gets a
 * ticket (this counts towards the service's quota), any other is read back.
 * With `force` (the user saved) a ticket that ended without a player id is
 * asked for again, which puts it back in the queue.
 * @param {string} friendCode normalised, see normalizeFriendCode
 * @param {{ force?: boolean }} [options] force also skips the re-check interval
 * @returns {Promise<LookupResult>}
 */
async function lookup(friendCode, { force = false } = {}) {
  if (!enabled()) return { status: 'off' }
  if (found.has(friendCode)) return found.get(friendCode)
  if (Date.now() < limitedUntil) return { status: 'limited' }
  if (!force && Date.now() - (lastChecked.get(friendCode) || 0) < RECHECK_MS) {
    return { status: 'pending' }
  }
  if (lastChecked.size > MAX_CHECKED) {
    lastChecked.forEach((at, code) => {
      if (Date.now() - at >= RECHECK_MS) lastChecked.delete(code)
    })
  }
  lastChecked.set(friendCode, Date.now())
  const uniqueId = `fc-${friendCode}`
  try {
    const existing = await request(
      'GET',
      `/api/v1/tickets?unique_id=${encodeURIComponent(uniqueId)}`,
    )
    let ticket = existing.status === 200 ? existing.json?.data?.[0] : null
    if (!ticket || (force && ENDED.has(ticket.status))) {
      const created = await request('POST', '/api/v1/tickets', {
        friend_code: friendCode,
        unique_id: uniqueId,
      })
      if (created.status === 429) {
        log.warn(TAGS.auth, 'player id lookup: quota used up')
        limitedUntil = Date.now() + LIMITED_MS
        return { status: 'limited' }
      }
      if (created.status >= 400) {
        log.warn(
          TAGS.auth,
          `player id lookup: ${created.status}`,
          created.json?.reason || created.json?.error || '',
        )
        // 400 / 422: not a valid friend code, it is not asked for again
        if (created.status === 400 || created.status === 422) {
          const rejected = /** @type {LookupResult} */ ({ status: 'failed' })
          found.set(friendCode, rejected)
          return rejected
        }
        return { status: 'pending' }
      }
      ticket = created.json?.data
      // known players are found within moments, read the new ticket once more
      if (ticket?.id && fromTicket(ticket).status === 'pending') {
        await new Promise((resolve) => {
          setTimeout(resolve, FIRST_READ_MS)
        })
        const again = await request('GET', `/api/v1/tickets/${ticket.id}`)
        if (again.status === 200 && again.json?.data) ticket = again.json.data
      }
    }
    const result = fromTicket(ticket)
    if (result.status === 'done') found.set(friendCode, result)
    return result
  } catch (e) {
    log.warn(TAGS.auth, 'player id lookup failed', e)
    return { status: 'pending' }
  }
}

/**
 * Fills in the player id of every player that only has a friend code, and
 * the trainer (name, level, team) of every friend code; an unnamed player is
 * named after the trainer. A player saved by player id is left as it is.
 * @param {import('./personalShiny').ShinyPlayer[]} players
 * @param {{ force?: boolean, forceCodes?: Set<string> }} [options] force
 *  (all codes, or the codes in forceCodes) asks again for a code whose
 *  lookup ended without an id
 * `resolved` tells whether anything was found that should be saved: a
 * player id, or a lookup that ended without one.
 * @returns {Promise<{ players: import('./personalShiny').ShinyPlayer[], resolved: boolean }>}
 */
async function resolvePlayers(players, options) {
  let resolved = false
  const next = await Promise.all(
    players.map(async (player) => {
      if (!player.fc || (player.id && player.trainer)) return player
      const force = !!options?.force || !!options?.forceCodes?.has(player.fc)
      const result = await lookup(player.fc, { force })
      const rest = { ...player }
      delete rest.lookup
      if (result.status === 'failed' || result.status === 'limited') {
        if (player.lookup !== result.status) resolved = true
        return { ...rest, lookup: result.status }
      }
      // still waiting: a failure shown before stays until there is news,
      // unless the user just asked again
      if (result.status !== 'done') return force ? rest : player
      resolved = true
      const trainerName = result.trainer?.name
      return {
        ...rest,
        id: result.playerId,
        name:
          DEFAULT_NAME.test(player.name) && trainerName
            ? trainerName.slice(0, 24)
            : player.name,
        ...(result.trainer ? { trainer: result.trainer } : {}),
      }
    }),
  )
  return { players: next, resolved }
}

module.exports = {
  enabled,
  normalizeFriendCode,
  lookup,
  resolvePlayers,
}
