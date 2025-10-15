// @ts-check
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { useMemory } from '@store/useMemory'

export function useGenTappables() {
  const { t } = useTranslation()
  const tappables = useMemory((s) => s.filters.tappables)
  const categories = useMemory((s) => s.menus.tappables?.categories || [])

  useEffect(() => {
    if (!tappables?.filter || !categories.includes('tappables')) {
      return
    }

    /** @type {import('@rm/types').ClientFilterObj['tappables']} */
    const tappableFilters = {}

    Object.keys(tappables.filter).forEach((id) => {
      if (id === 'global' || id === 'q0') return
      const itemId = id.startsWith('q') ? id.slice(1) : id
      const name = t(`item_${itemId}`, `#${itemId}`)
      tappableFilters[id] = {
        name,
        perms: ['tappables'],
      }
      tappableFilters[id].searchMeta =
        `${t('tappables').toLowerCase()} ${String(name).toLowerCase()}`
    })

    if (Object.keys(tappableFilters).length === 0) {
      return
    }

    useMemory.setState((prev) => ({
      menuFilters: {
        ...prev.menuFilters,
        tappables: {
          ...(prev.menuFilters?.tappables || {}),
          ...tappableFilters,
        },
      },
    }))
  }, [tappables, categories, t])
}
