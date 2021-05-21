import L from 'leaflet'
import { useMasterfile, useStore } from '../../hooks/useStore'

export default function pokemonMarker(iconUrl, pkmn, pvpRanks) {
  const { map: { theme: { glow }, iconSizes } } = useMasterfile(state => state.config)
  const { pokemon: { filter } } = useStore(state => state.filters)

  const getGlowColor = () => {
    let pvpBest = 4096
    let color
    let badge
    if (pvpRanks.great.best && pvpRanks.ultra.best) {
      if (pvpRanks.great.best < pvpRanks.ultra.best) {
        pvpBest = pvpRanks.great.best
      } else {
        pvpBest = pvpRanks.ultra.best
      }
    } else if (pvpRanks.great.best) {
      pvpBest = pvpRanks.great.best
    } else if (pvpRanks.ultra.best) {
      pvpBest = pvpRanks.ultra.best
    }
    if (pvpBest === 3) {
      badge = 'third'
    } else if (pvpBest === 2) {
      badge = 'second'
    } else if (pvpBest === 1) {
      badge = 'first'
    }
    if (pvpBest <= glow.pvp.value && pkmn.iv >= glow.iv.value) {
      color = glow.both.color
    } else if (pvpBest <= glow.pvp.value) {
      color = glow.pvp.color
    } else if (pkmn.iv >= glow.iv.value) {
      color = glow.iv.color
    }
    return { color, badge }
  }
  const { color, badge } = getGlowColor(pkmn.pokemon_id, pkmn.form)
  const size = iconSizes.pokemon[filter[`${pkmn.pokemon_id}-${pkmn.form}`].size]

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
