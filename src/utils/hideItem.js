// @ts-check
import { useMemory } from '@store/useMemory'
import { useStorage } from '@store/useStorage'

/**
 * Hides a map object. Objects with a known expiry (e.g. Pokémon, tappables) are
 * remembered across reloads until they despawn; everything else is hidden for the
 * current session only, as before.
 *
 * @param {string | number} id
 * @param {number | null} [expireTimestamp] unix seconds
 */
export function hideItem(id, expireTimestamp) {
  if (id === undefined || id === null) return
  useMemory.setState((prev) => ({ hideList: new Set(prev.hideList).add(id) }))

  const now = Date.now() / 1000
  if (!expireTimestamp || expireTimestamp <= now) return
  useStorage.setState((prev) => {
    /** @type {Record<string, number>} */
    const hiddenUntil = {}
    Object.entries(prev.hiddenUntil || {}).forEach(([key, until]) => {
      if (until > now) hiddenUntil[key] = until
    })
    hiddenUntil[`${id}`] = expireTimestamp
    return { hiddenUntil }
  })
}

/**
 * @param {string | number} id
 * @param {Set<string | number>} hideList
 * @param {Record<string, number>} hiddenUntil
 * @param {number} now unix seconds
 */
export function isHidden(id, hideList, hiddenUntil, now) {
  if (hideList.has(id)) return true
  const until = hiddenUntil?.[`${id}`]
  return !!until && until > now
}
