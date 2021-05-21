import { useStore, useMasterfile } from '../../hooks/useStore'

export default function getIconSize(type, info, subType) {
  const { map: { iconSizes } } = useMasterfile(state => state.config)
  const filters = useStore(state => state.filters)
  let filterId
  switch (subType || type) {
    default: filterId = info; break
    case 'gyms': filterId = `t${info.team_id}`; break
    case 'raids': filterId = `p${info.raid_pokemon_id}-${info.raid_pokemon_form}`; break
    case 'eggs': filterId = `e${info.raid_level}`; break
    case 'pokemon': filterId = `${info.pokemon_id}-${info.form}`; break
    case 'device': filterId = info; break
  }
  if (filters[type].filter[filterId]) {
    const { size } = filters[type].filter[filterId]
    return iconSizes[type][size]
  }
  return iconSizes[type].md
}
