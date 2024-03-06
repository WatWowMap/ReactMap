// @ts-check
import { divIcon } from 'leaflet'
import { useMemory } from '@store/useMemory'

/**
 *
 * @param {{
 *  iconUrl: string,
 *  pokemonId: number,
 *  formId?: number,
 *  iconSize: number,
 *  recent: boolean,
 * }} props
 * @returns
 */
export function nestMarker({ iconUrl, pokemonId, formId, iconSize, recent }) {
  const { Icons, masterfile } = useMemory.getState()
  const { types } = masterfile.pokemon[pokemonId]?.forms?.[formId]?.types
    ? masterfile.pokemon[pokemonId].forms[formId]
    : masterfile.pokemon[pokemonId]
  const [
    { offsetX, offsetY, popupX, popupY, sizeMultiplier, nestMonSizeMulti = 1 },
  ] = Icons.getModifiers('nest')
  const opacity = recent ? 1 : 0.5

  return divIcon({
    iconSize: [iconSize * sizeMultiplier, iconSize * sizeMultiplier],
    iconAnchor: [(iconSize / 2) * offsetX, (iconSize / 0.75) * offsetY],
    popupAnchor: [
      0 + popupX - offsetX * 0.6 + popupX,
      -8 - iconSize + popupY - offsetY * 0.6 + popupY,
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
                width: ${iconSize}px; 
                height: auto; 
                opacity: ${opacity};
              "
            />
            <img
              src="${Icons.getNests(types[1])}"
              alt="${types[1]}"
              class="type-img-2"
              style="
                width: ${iconSize}px; 
                height: auto; 
                opacity: ${types.length === 2 ? opacity : 0};
              "
            />
        </span>
        <img
          src="${iconUrl}"
          alt="${pokemonId}"
          style="
            width: ${iconSize * nestMonSizeMulti}px; 
            height: ${iconSize * nestMonSizeMulti}px; 
            bottom: ${offsetY - 1}px; 
            left: ${offsetX - 1}px; 
            opacity: ${opacity};
          "
        />
      </div>
    `,
  })
}
