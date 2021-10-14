import { useTranslation } from 'react-i18next'

export default function genGyms(Icons, gyms) {
  const { t } = useTranslation()

  const tempObj = {
    eggs: {},
    raids: {},
    teams: {},
  }

  Object.keys(gyms.filter).forEach(id => {
    if (id !== 'global'
      && !/\d/.test(id.charAt(0))
      && !id.startsWith('g')) {
      switch (id.charAt(0)) {
        case 'e':
          tempObj.eggs[id] = {
            name: t(`egg_${id.slice(1)}_plural`),
            url: Icons.getEggs(id.slice(1), false),
            perm: 'raids',
          }; break
        case 'r':
          tempObj.raids[id] = {
            name: t(`raid_${id.slice(1).split('-')[0]}_plural`),
            url: Icons.getEggs(id.slice(1), true),
            perm: 'raids',
          }; break
        default:
          tempObj.teams[id] = {
            name: t(`team_${id.slice(1).split('-')[0]}`),
            url: Icons.getGyms(...id.slice(1).split('-')),
            perm: 'gyms',
          }; break
      }
    }
  })

  return tempObj
}
