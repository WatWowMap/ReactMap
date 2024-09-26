// @ts-check

import { useMemory } from '@store/useMemory'
import { useStorage } from '@store/useStorage'

/**
 * @param {string} category
 * @returns {boolean}
 */
export function usePermCheck(category) {
  const filters = useStorage((s) => s.filters[category])
  const perms = useMemory((s) => s.auth.perms)

  if (!filters || !perms.map) return false

  switch (category) {
    case 'scanAreas':
      if (filters?.enabled && perms.scanAreas) {
        return true
      }
      break
    case 'gyms':
      if (
        (filters.allGyms && perms.gyms) ||
        (filters.raids && perms.raids) ||
        (filters.exEligible && perms.gyms) ||
        (filters.inBattle && perms.gyms) ||
        (filters.arEligible && perms.gyms) ||
        (filters.gymBadges && perms.gymBadges)
      ) {
        return true
      }
      break
    case 'nests':
      if ((perms.nests && filters.pokemon) || filters.polygons) {
        return true
      }
      break
    case 'pokestops':
      if (
        (filters.allPokestops && perms.pokestops) ||
        (filters.lures && perms.lures) ||
        (filters.invasions && perms.invasions) ||
        (filters.quests && perms.quests) ||
        (filters.eventStops && perms.eventStops) ||
        (filters.arEligible && perms.pokestops)
      ) {
        return true
      }
      break
    case 's2cells':
      if (filters?.enabled && filters?.cells?.length && perms.s2cells) {
        return true
      }
      break
    case 'stations':
      if (
        (filters?.allStations && perms?.stations) ||
        (filters?.maxBattles && perms?.dynamax)
      ) {
        return true
      }
      break
    default:
      if (filters?.enabled && perms[category]) {
        return true
      }
  }
  return false
}
