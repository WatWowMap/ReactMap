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
  const storageState = useStorage.getState()
  const localFilters = storageState.filters?.[category] ?? {}
  const easyMode = !!localFilters.easyMode
  const userFilters = localFilters.filter ?? {}

  const serverFilters = useMemory.getState().filters[category]
  const staticFilters = Object.entries(serverFilters?.filter ?? {})
  const refFilter = serverFilters?.standard ?? STANDARD_BACKUP

  const idSet = new Set(selectedIds ?? [])

  const menuSelections = storageState.menus?.[category]?.filters ?? {}
  const hasMenuFiltersApplied = Object.values(menuSelections).some((options) =>
    Object.values(options || {}).some(Boolean),
  )
  const advancedSearch =
    /** @type {string | undefined} */ (
      storageState.searches?.[`${category}Advanced`]
    ) ?? ''
  const hasSearchApplied =
    typeof advancedSearch === 'string' && advancedSearch.trim().length > 0

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
  if (
    category === 'pokemon' &&
    typeof newFilter.enabled === 'boolean' &&
    newObj.global &&
    !hasMenuFiltersApplied &&
    !hasSearchApplied
  ) {
    newObj.global = {
      ...newObj.global,
      enabled: newFilter.enabled,
      all: newFilter.enabled ? !!easyMode : false,
    }
  } else if (
    category !== 'pokemon' &&
    typeof newFilter.enabled === 'boolean' &&
    newObj.global &&
    !hasMenuFiltersApplied &&
    !hasSearchApplied
  ) {
    newObj.global = {
      ...newObj.global,
      enabled: newFilter.enabled,
    }
  }
  setDeepStore(`filters.${category}.filter`, newObj)
}
