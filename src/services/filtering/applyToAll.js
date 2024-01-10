// @ts-check

import { setDeepStore, useStatic, useStore } from '@hooks/useStore'
import Utility from '@services/Utility'

export const STANDARD_BACKUP =
  /** @type {import('@rm/types/lib').BaseFilter} */ ({
    enabled: false,
    size: 'md',
    all: false,
    adv: '',
  })

/**
 * @param {boolean} show
 * @param {import('@rm/types').Categories} category
 * @param {string[]} [selectedIds]
 * @param {boolean} [includeSlots]
 */
export function applyToAll(
  show,
  category,
  selectedIds = [],
  includeSlots = false,
) {
  const localFilters = useStore.getState().filters[category]
  const easyMode = !!localFilters.easyMode
  const userFilters = localFilters.filter ?? {}

  const serverFilters = useStatic.getState().filters[category]
  const staticFilters = serverFilters.filter ?? {}
  const refFilter = serverFilters.standard ?? STANDARD_BACKUP

  const idSet = new Set(selectedIds ?? [])

  const newObj = Object.fromEntries(
    Object.keys(staticFilters).flatMap((key) => {
      const filter = userFilters[key] ?? staticFilters[key] ?? refFilter
      const filters = [
        [
          key,
          idSet.has(key)
            ? { size: 'md', ...filter, enabled: show, all: !!easyMode }
            : filter,
        ],
      ]
      if (key.startsWith('t') && +key.charAt(1) !== 0 && includeSlots) {
        filters.push(
          ...Object.entries(Utility.generateSlots(key, show, userFilters)),
        )
      }
      return filters
    }),
  )
  setDeepStore(`filters.${category}.filter`, newObj)
}
