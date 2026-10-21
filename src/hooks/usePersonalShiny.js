// @ts-check
import * as React from 'react'
import { useApolloClient } from '@apollo/client'

import { useMemory } from '@store/useMemory'
import { Query } from '@services/queries'

/** How often the players are read again while a friend code is looked up */
const PENDING_REFRESH_MS = 30_000
/** When the players were last saved here; older reads are outdated */
let lastSaved = 0

/** Called when the user saves players, so a read started before is dropped */
export function notePlayersSaved() {
  lastSaved = Date.now()
}

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
      // like the server: the first personalShinyMax players, not paused
      parseShinyPlayers(s.auth.data?.personalShiny)
        .slice(0, s.auth.personalShinyMax)
        .some((p) => p.id.trim() && !p.paused),
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
 * While a saved friend code is still being looked up, the players are read
 * again now and then, so the player id shows up without reloading the page.
 */
export function usePendingLookupRefresh() {
  const client = useApolloClient()
  const pending = useMemory(
    (s) =>
      !!s.auth.loggedIn &&
      !!s.auth.perms?.personalShiny &&
      // without lookups on the server the id never comes
      !!s.auth.personalShinyLookup &&
      parseShinyPlayers(s.auth.data?.personalShiny).some(
        (p) => p.fc && !p.id && p.lookup !== 'failed',
      ),
  )
  React.useEffect(() => {
    if (!pending) return undefined
    const timer = window.setInterval(async () => {
      const started = Date.now()
      try {
        const { data } = await client.query({
          query: Query.user('GET_PERSONAL_SHINY'),
          fetchPolicy: 'no-cache',
        })
        const players = data?.personalShinyPlayers
        // a save since: its answer is newer than this read
        if (!Array.isArray(players) || started <= lastSaved) return
        const current = useMemory.getState().auth.data?.personalShiny
        if (
          JSON.stringify(parseShinyPlayers(current)) === JSON.stringify(players)
        )
          return
        useMemory.setState((prev) => ({
          auth: {
            ...prev.auth,
            data: { ...prev.auth.data, personalShiny: players },
          },
        }))
      } catch (e) {
        // tried again at the next interval
      }
    }, PENDING_REFRESH_MS)
    return () => window.clearInterval(timer)
  }, [pending, client])
}

/**
 * Whether a client option belongs to personal shiny and should be hidden.
 * The server leaves `perm` out of top-level options, so those are known by
 * their name.
 * @param {{ perm?: string | string[] } | undefined} meta
 * @param {boolean} hasPlayers
 * @param {string} [name] the option's name
 */
export function isHiddenShinyOption(meta, hasPlayers, name = '') {
  if (hasPlayers) return false
  if (name.startsWith('personalShiny')) return true
  if (!meta?.perm) return false
  const perms = Array.isArray(meta.perm) ? meta.perm : [meta.perm]
  return perms.length > 0 && perms.every((perm) => perm === 'personalShiny')
}
