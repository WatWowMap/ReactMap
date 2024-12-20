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
 * @param {import('@rm/types').ClientFilters<T>} newFilter
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
  const staticFilters = Object.entries(serverFilters?.filter ?? {})
  const refFilter = serverFilters?.standard ?? STANDARD_BACKUP

  const idSet = new Set(selectedIds ?? [])
  if (category === 'pokemon' && selectedIds.length >= staticFilters.length - 1)
    idSet.add('global')

  const newObj = Object.fromEntries(
    staticFilters.flatMap(([key, staticFilter]) => {
      const filter = userFilters[key] ?? staticFilter ?? refFilter
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
