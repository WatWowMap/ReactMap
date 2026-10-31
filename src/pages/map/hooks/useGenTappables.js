// @ts-check
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { useMemory } from '@store/useMemory'

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
      if (id === 'global' || id === 'q0') return
      let name
      switch (id.charAt(0)) {
        case 'c':
          name = `${t(`poke_${id.slice(1)}`)} ${t('candy')}`
          break
        case 'x':
          name = `${t(`poke_${id.slice(1)}`)} ${t('xl')}`
          break
        case 'm': {
          const [pokemonId, amount, tempEvolution] = id.slice(1).split('-', 3)
          name = `${tempEvolution ? `${t(`evo_${tempEvolution}`)} ` : ''}${t(
            `poke_${pokemonId}`,
          )} x${amount}`
          break
        }
        default: {
          if (Number.isInteger(Number(id))) {
            name = t(`poke_${id}`)
            break
          }
          const itemId = id.startsWith('q') ? id.slice(1) : id
          name = t(`item_${itemId}`, `#${itemId}`)
        }
      }
      tappableFilters[id] = {
        name,
        perms: ['tappables'],
      }
      tappableFilters[id].searchMeta =
        `${t('tappables').toLowerCase()} ${String(name).toLowerCase()}${
          id.startsWith('m') ? ` ${t('quest_reward_12').toLowerCase()}` : ''
        }`
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
