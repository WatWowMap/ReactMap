// @ts-check

import { useMemory } from '@store/useMemory'
import { useStorage, setDeepStore } from '@store/useStorage'
import { generateSlots } from '@utils/generateSlots'

export const STANDARD_BACKUP =
  /** @type {import('@rm/types/lib').BaseFilter} */ ({
    enabled: false,
    size: 'md',
    all: false,
    adv: '',
  })

/**
 * @template {import('@rm/types').Categories} T
 * @param {T extends 'pokemon' ? import('@rm/types/lib').PokemonFilter : import('@rm/types').BaseFilter} newFilter
 * @param {T} category
 * @param {string[]} [selectedIds]
 * @param {boolean} [includeSlots]
 */
export function applyToAll(
  newFilter,
  category,
  selectedIds = [],
  includeSlots = false,
) {
  const localFilters = useStorage.getState().filters[category]
  const easyMode = !!localFilters.easyMode
  const userFilters = localFilters.filter ?? {}

  const serverFilters = useMemory.getState().filters[category]
  const staticFilters = serverFilters?.filter ?? {}
  const refFilter = serverFilters?.standard ?? STANDARD_BACKUP

  const idSet = new Set(selectedIds ?? [])

  const newObj = Object.fromEntries(
    Object.keys(staticFilters).flatMap((key) => {
      const filter = userFilters[key] ?? staticFilters[key] ?? refFilter
      const filters = [
        [
          key,
          idSet.has(key)
            ? { size: 'md', ...filter, ...newFilter, all: !!easyMode }
            : filter,
        ],
      ]
      if (key.startsWith('t') && +key.charAt(1) !== 0 && includeSlots) {
        filters.push(
          ...Object.entries(generateSlots(key, newFilter.enabled, userFilters)),
        )
      }
      return filters
    }),
  )
  setDeepStore(`filters.${category}.filter`, newObj)
}
