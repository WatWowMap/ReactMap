import L from 'leaflet'

export default function nestMarker(
  iconUrl,
  nest,
  pokemon,
  filters,
  Icons,
  recent,
) {
  const { types } = pokemon
  const filterId = `${nest.pokemon_id}-${nest.pokemon_form}`
  const size = Icons.getSize('nest', filters.filter[filterId])
  const [
    { offsetX, offsetY, popupX, popupY, sizeMultiplier, nestMonSizeMulti = 1 },
  ] = Icons.getModifiers('nest')
  const opacity = recent ? 1 : 0.5

  return L.divIcon({
    iconSize: [size * sizeMultiplier, size * sizeMultiplier],
    iconAnchor: [(size / 2) * offsetX, (size / 0.75) * offsetY],
    popupAnchor: [
      0 + popupX - offsetX * 0.6 + popupX,
      -8 - size + popupY - offsetY * 0.6 + popupY,
    ],
    className: 'nest-marker',
    html: /* html */ `
      <div class="marker-image-holder">
        <span class="text-nowrap">
            <img
              src="${Icons.getNests(types[0])}"
              alt="${types[0]}"
              class="${types.length === 2 ? 'type-img-1' : 'type-img-single'}"
              style="
                width: ${size}px; 
                height: auto; 
                opacity: ${opacity};
              "
            />
            <img
              src="${Icons.getNests(types[1])}"
              alt="${types[1]}"
              class="type-img-2"
              style="
                width: ${size}px; 
                height: auto; 
                opacity: ${types.length === 2 ? opacity : 0};
              "
            />
        </span>
        <img
          src="${iconUrl}"
          alt="${nest.pokemon_id}"
          style="
            width: ${size * nestMonSizeMulti}px; 
            height: ${size * nestMonSizeMulti}px; 
            bottom: ${offsetY - 1}px; 
            left: ${offsetX - 1}px; 
            opacity: ${opacity};
          "
        />
      </div>
    `,
  })
}
