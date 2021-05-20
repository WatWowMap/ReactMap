import { useStore, useMasterfile } from '../../hooks/useStore'

export default function getIconSize(type, info) {
  const { map: { iconSizes } } = useMasterfile(state => state.config)
  const filters = useStore(state => state.filters)
  let filterId
  switch (type) {
    default: filterId = info; break
    case 'gym': filterId = `t${info.team_id}`; break
    case 'raid': filterId = `p${info.raid_pokemon_id}-${info.raid_form}`; break
    case 'pokemon': filterId = `${info.pokemon_id}-${info.form}`; break
    case 'device': filterId = info; break
  }
  if (filters[type].filter[filterId]) {
    const { size } = filters[type].filter[filterId]
    return iconSizes[type][size]
  }
  return iconSizes[type].md
}
