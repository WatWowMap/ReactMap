import { useTranslation } from 'react-i18next'

import { useStatic } from '@hooks/useStore'

export default function genGyms() {
  const { t } = useTranslation()
  const Icons = useStatic(s => s.Icons)
  const { gyms } = useStatic(s => s.filters)
  const { gyms: { categories } } = useStatic(s => s.menus)

  const tempObj = Object.fromEntries(categories.map(x => [x, {}]))
  if (!gyms?.filter) return {}

  Object.keys(gyms.filter).forEach(id => {
    if (id !== 'global'
      && !/\d/.test(id.charAt(0))
      && !id.startsWith('g')) {
      switch (id.charAt(0)) {
        case 'e':
          tempObj.eggs[id] = {
            name: t(`egg_${id.slice(1)}_plural`),
            url: Icons.getEggs(id.slice(1), false),
            perms: ['raids'],
          }; break
        case 'r':
          tempObj.raids[id] = {
            name: t(`raid_${id.slice(1).split('-')[0]}_plural`),
            url: Icons.getEggs(id.slice(1), true),
            perms: ['raids'],
          }; break
        default:
          tempObj.teams[id] = {
            name: t(`team_${id.slice(1).split('-')[0]}`),
            url: Icons.getGyms(...id.slice(1).split('-')),
            perms: ['gyms'],
          }; break
      }
    }
  })

  return tempObj
}
