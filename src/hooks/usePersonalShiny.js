// @ts-check
import { useMemory } from '@store/useMemory'

/**
 * `id` is empty while the server looks up the player id behind `fc`, `trainer`
 * is the account the friend code belongs to
 * @typedef {{
 *  name: string,
 *  id: string,
 *  fc?: string,
 *  trainer?: { name?: string, level?: number, team?: string },
 *  paused?: boolean,
 *  lookup?: 'failed' | 'limited',
 * }} ShinyPlayer
 */

// every Pokémon on the map asks, so the last parse is reused
let lastValue
/** @type {ShinyPlayer[]} */
let lastParsed = []

/**
 * The player ids a user saved for personal shiny (stored as JSON or an array).
 * @param {unknown} value
 * @returns {ShinyPlayer[]}
 */
export function parseShinyPlayers(value) {
  if (value === lastValue) return lastParsed
  lastValue = value
  lastParsed = parse(value)
  return lastParsed
}

/**
 * @param {unknown} value
 * @returns {ShinyPlayer[]}
 */
function parse(value) {
  try {
    const list = typeof value === 'string' ? JSON.parse(value) : value
    return Array.isArray(list)
      ? list.map((p) => ({
          name: `${p?.name || ''}`,
          id: `${p?.id || ''}`,
          ...(p?.fc ? { fc: `${p.fc}` } : {}),
          ...(p?.trainer && typeof p.trainer === 'object'
            ? { trainer: p.trainer }
            : {}),
          ...(p?.paused === true ? { paused: true } : {}),
          ...(p?.lookup ? { lookup: p.lookup } : {}),
        }))
      : []
  } catch (e) {
    return []
  }
}

/**
 * Personal shiny options are only shown once the user has the permission AND
 * may and has saved at least one player id; the profile section to add one
 * needs the permission and a limit above 0.
 * @returns {boolean}
 */
export function useHasShinyPlayers() {
  return useMemory(
    (s) =>
      !!s.auth.perms?.personalShiny &&
      s.auth.personalShinyMax > 0 &&
      parseShinyPlayers(s.auth.data?.personalShiny).some(
        (p) => p.id.trim() && !p.paused,
      ),
  )
}

/**
 * Whether the user has more than one active player, the server takes the first
 * `personalShinyMax` saved players and skips the paused ones
 * @returns {boolean}
 */
export function useHasMultipleShinyPlayers() {
  return useMemory(
    (s) =>
      parseShinyPlayers(s.auth.data?.personalShiny)
        .slice(0, s.auth.personalShinyMax || 0)
        .filter((p) => p.id.trim() && !p.paused).length > 1,
  )
}

/**
 * Whether a client option belongs to personal shiny and should be hidden.
 * @param {{ perm?: string | string[] } | undefined} meta
 * @param {boolean} hasPlayers
 */
export function isHiddenShinyOption(meta, hasPlayers) {
  if (hasPlayers || !meta?.perm) return false
  const perms = Array.isArray(meta.perm) ? meta.perm : [meta.perm]
  return perms.length > 0 && perms.every((perm) => perm === 'personalShiny')
}
