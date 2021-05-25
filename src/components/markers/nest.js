import L from 'leaflet'

export default function nestMarker(iconUrl, nest, pokemon, filters, iconSizes, recent) {
  const filterId = `${nest.pokemon_id}-${nest.pokemon_form}`
  const size = filters[filterId] ? iconSizes[filters[filterId].size] : iconSizes.md

  const opacity = recent ? 1 : 0.5

  const getTypesIcon = (pkmn) => {
    if (pkmn) {
      const { types } = pkmn
      if (types && types.length > 0) {
        if (types.length === 2) {
          return `
            <span class="text-nowrap">
              <img 
                src="/images/nest/nest-${types[0].toLowerCase()}.png" 
                style="width:${size}px;height:auto;opacity:${opacity};"
                class="type-img-1"
              >
              <img 
                src="/images/nest/nest-${types[1].toLowerCase()}.png" 
                style="width:${size}px;height:auto;opacity:${opacity};"
                class="type-img-2"
              >
            </span>`
        }
        return `
          <span class="text-nowrap">
            <img 
              src="/images/nest/nest-${types[0].toLowerCase()}.png" 
              style="width:${size}px;height:auto;opacity:${opacity};"
              class="type-img-single"
            >
          </span>`
      }
    }
  }

  return L.divIcon({
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 0.75],
    popupAnchor: [0, -8 - size],
    className: 'nest-marker',
    html: `
      <div class="marker-image-holder">
        ${getTypesIcon(pokemon)}
        <img
          src="${iconUrl}"
          style="width:${size}px;height:${size}px;opacity:${opacity};"
        />
      </div>`,
  })
}
