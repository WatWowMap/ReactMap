import L, { Icon } from 'leaflet'
import { useMasterfile, useStore } from '../../hooks/useStore'

export const basicMarker = (iconUrl, pkmn) => {
  const { map: { iconSizes } } = useMasterfile(state => state.config)
  const { pokemon: { filter } } = useStore(state => state.filters)

  const filterId = `${pkmn.pokemon_id}-${pkmn.form}`
  const size = filter[filterId] ? iconSizes.pokemon[filter[filterId].size] : iconSizes.pokemon.md

  return new Icon({
    iconUrl,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, size * -0.6],
    className: 'marker',
  })
}

export const fancyMarker = (iconUrl, pkmn, bestPvp) => {
  const { map: { theme: { glow }, iconSizes } } = useMasterfile(state => state.config)
  const { pokemon: { filter } } = useStore(state => state.filters)

  const getGlowColor = () => {
    let color
    let badge
    if (bestPvp) {
      switch (bestPvp) {
        default: badge = 'first'; break
        case 2: badge = 'second'; break
        case 3: badge = 'third'; break
      }
    }
    if (bestPvp <= glow.pvp.value && pkmn.iv >= glow.iv.value) {
      color = glow.both.color
    } else if (bestPvp <= glow.pvp.value) {
      color = glow.pvp.color
    } else if (pkmn.iv >= glow.iv.value) {
      color = glow.iv.color
    }
    return { color, badge }
  }
  const { color, badge } = getGlowColor(pkmn.pokemon_id, pkmn.form)
  const filterId = `${pkmn.pokemon_id}-${pkmn.form}`
  const size = filter[filterId] ? iconSizes.pokemon[filter[filterId].size] : iconSizes.pokemon.md

  const pvpHtml = badge ? `
    <img src="/images/misc/${badge}.png" 
      style="width:${size / 2}px;
      height:auto;
      position:absolute;
      right:0;
      bottom:0;"
    />` : ''

  return L.divIcon({
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, size * -0.6],
    className: 'pokemon-marker',
    html: `
      <div class="marker-image-holder">
        <img 
          src="${iconUrl}" 
          style=" ${color ? `filter:drop-shadow(0 0 10px ${color})drop-shadow(0 0 10px ${color});-webkit-filter:drop-shadow(0 0 10px ${color})drop-shadow(0 0 10px ${color});` : ''}
          width:${size}px;
          height:${size}px;"
        />
      </div>
      ${pvpHtml}`,
  })
}
