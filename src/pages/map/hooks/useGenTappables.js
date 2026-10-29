// @ts-check
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { useMemory } from '@store/useMemory'
import {
  getTappableRewardFromKey,
  getTappableRewardName,
} from '@features/tappable/rewards'

export function useGenTappables() {
  const { t } = useTranslation()
  const tappables = useMemory((s) => s.filters.tappables)
  const categories = useMemory((s) => s.menus.tappables?.categories)

  useEffect(() => {
    const hasCategory = Array.isArray(categories)
      ? categories.includes('tappables')
      : !!categories?.tappables
    if (!tappables?.filter || !hasCategory) {
      return
    }

    /** @type {import('@rm/types').ClientFilterObj['tappables']} */
    const tappableFilters = {}

    Object.keys(tappables.filter).forEach((id) => {
      const reward = getTappableRewardFromKey(id)
      if (!reward) return
      const name = getTappableRewardName(reward, t)
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
