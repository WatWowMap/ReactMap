import L from 'leaflet'

export default function nestMarker(iconUrl, pokemon, filters, iconSizes) {
  const filterId = `${pokemon.pokemon_id}-${pokemon.form}`
  const size = filters[filterId] ? iconSizes[filters[filterId].size] : iconSizes.md

  const getTypesIcon = (pkmn) => {
    if (pkmn) {
      const { types } = pkmn
      if (types && types.length > 0) {
        if (types.length === 2) {
          return `
            <span class="text-nowrap">
              <img 
                src="/images/nest/nest-${types[0].toLowerCase()}.png" 
                style="width:${size}px;height:auto;"
                class="type-img-1"
              >
              <img 
                src="/images/nest/nest-${types[1].toLowerCase()}.png" 
                style="width:${size}px;height:auto;"
                class="type-img-2"
              >
            </span>`
        }
        return `
          <span class="text-nowrap">
            <img 
              src="/images/nest/nest-${types[0].toLowerCase()}.png" 
              style="width:${size}px;height:auto;"
              class="type-img-single"
            >
          </span>`
      }
    }
  }

  return L.divIcon({
    iconSize: [size, size],
    iconAnchor: [40 / 2, size],
    popupAnchor: [0, -8 - size],
    className: 'nest-marker',
    html: `
      <div class="marker-image-holder">
        ${getTypesIcon(pokemon)}
        <img
          src="${iconUrl}"
          style="width:${size}px;height:${size}px;"
        />
      </div>`,
  })
}
