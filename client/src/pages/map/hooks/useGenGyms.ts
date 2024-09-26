import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { useMemory } from '@store/useMemory'

export function useGenGyms() {
  const { t } = useTranslation()
  const gyms = useMemory((s) => s.filters.gyms)
  const categories = useMemory((s) => s.menus.gyms.categories)

  useEffect(() => {
    const tempObj: import('@rm/types').ClientFilterObj = Object.fromEntries(
      categories.map((x) => [x, {}]),
    )
    if (!gyms?.filter) return

    if (tempObj.eggs) {
      tempObj.eggs.e90 = {
        name: t('poke_global'),
        perms: ['raids'],
        webhookOnly: true,
      }
    }
    if (tempObj.raids) {
      tempObj.raids.r90 = {
        name: t('poke_global'),
        perms: ['raids'],
        webhookOnly: true,
      }
    }
    if (tempObj.teams) {
      tempObj.teams.t4 = {
        name: t('poke_global'),
        perms: ['gyms'],
        webhookOnly: true,
      }
    }

    Object.keys(gyms.filter).forEach((id) => {
      if (id !== 'global' && !/\d/.test(id.charAt(0)) && !id.startsWith('g')) {
        switch (id.charAt(0)) {
          case 'e':
            tempObj.eggs[id] = {
              name: t(`egg_${id.slice(1)}_plural`),
              perms: ['raids'],
              searchMeta: `${t(`egg_${id.slice(1)}_plural`)} ${t(
                'eggs',
              ).toLowerCase()}`,
            }
            break
          case 'r':
            tempObj.raids[id] = {
              name: t(`raid_${id.slice(1).split('-')[0]}_plural`),
              perms: ['raids'],
              searchMeta: `${t(`raid_${id.slice(1)}_plural`)} ${t(
                'raids',
              ).toLowerCase()}`,
              webhookOnly: true,
            }
            break
          default:
            tempObj.teams[id] = {
              name: t(`team_${id.slice(1).split('-')[0]}`),
              perms: ['gyms'],
              searchMeta: `${t(`team_${id.slice(1)}`)} ${t(
                'teams',
              ).toLowerCase()}`,
            }
            break
        }
      }
    })
    useMemory.setState((prev) => ({
      menuFilters: { ...prev.menuFilters, ...tempObj },
    }))
  }, [gyms, categories, t])
}
