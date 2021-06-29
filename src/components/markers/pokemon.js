import L, { Icon } from 'leaflet'

export const basicMarker = (iconUrl, pkmn, filters, iconSizes) => {
  const filterId = `${pkmn.pokemon_id}-${pkmn.form}`
  const size = filters.filter[filterId] ? iconSizes[filters.filter[filterId].size] : iconSizes.md

  return new Icon({
    iconUrl,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, size * -0.6],
    className: 'marker',
  })
}

export const fancyMarker = (iconUrl, pkmn, filters, iconSizes, glow, ivCircle) => {
  let badge
  switch (pkmn.bestPvp) {
    default: break
    case 1: badge = 'first'; break
    case 2: badge = 'second'; break
    case 3: badge = 'third'; break
  }

  const filterId = `${pkmn.pokemon_id}-${pkmn.form}`
  const size = filters.filter[filterId] ? iconSizes[filters.filter[filterId].size] : iconSizes.md

  const getExtraHtml = () => {
    if (badge) {
      return `
        <img src="/images/misc/${badge}.png" 
          style="width:${size / 2}px;
          height:auto;
          position:absolute;
          right:0;
          bottom:0;"
        />`
    }
    if (ivCircle) {
      return `
        <div class="iv-badge" style="right: -10px; bottom: -5px;">
          ${Math.round(pkmn.iv)}
        </div>`
    }
    return ''
  }

  return L.divIcon({
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, size * -0.6],
    className: 'pokemon-marker',
    html: `
      <div class="marker-image-holder">
        <img 
          src="${iconUrl}" 
          style=" ${glow ? `filter:drop-shadow(0 0 10px ${glow})drop-shadow(0 0 10px ${glow});-webkit-filter:drop-shadow(0 0 10px ${glow})drop-shadow(0 0 10px ${glow});` : ''}
          width:${size}px;
          height:${size}px;"
        />
      </div>
      ${getExtraHtml()}`,
  })
}
