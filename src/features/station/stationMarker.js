// @ts-check
import { divIcon } from 'leaflet'

import { basicEqualFn, useMemory } from '@store/useMemory'
import { useStorage } from '@store/useStorage'
import { useOpacity } from '@hooks/useOpacity'

/**
 *
 * @param {import('@rm/types').Station} param0
 * @returns
 */
export function stationMarker({
  battle_level,
  battle_pokemon_alignment,
  battle_pokemon_costume,
  battle_pokemon_form,
  battle_pokemon_gender,
  battle_pokemon_id,
  is_battle_available,
  is_inactive,
}) {
  const [, Icons] = useStorage(
    (s) => [s.icons, useMemory.getState().Icons],
    (a, b) => Object.entries(a[0]).every(([k, v]) => b[0][k] === v),
  )
  const [baseIcon, baseSize, battleIcon, battleSize] = useStorage((s) => {
    const { filter } = s.filters.stations
    return [
      Icons.getStation(!is_inactive),
      Icons.getSize('station', filter[`j${battle_level}`]?.size),
      Icons.getPokemon(
        battle_pokemon_id,
        battle_pokemon_form,
        0,
        battle_pokemon_gender,
        battle_pokemon_costume,
        battle_pokemon_alignment,
      ),
      Icons.getSize(
        'dynamax',
        filter[`${battle_pokemon_id}-${battle_pokemon_form}`]?.size,
      ),
    ]
  }, basicEqualFn)
  const [stationMod, battleMod] = Icons.getModifiers('station', 'dynamax')
  const getOpacity = useOpacity('station')

  return divIcon({
    popupAnchor: [
      0 + stationMod.popupX + stationMod.offsetX,
      (-baseSize - battleSize) * 0.67 +
        stationMod.popupY +
        stationMod.offsetY +
        (battleMod.offsetY + battleMod.popupY),
    ],
    className: 'station-marker',
    html: /* html */ `
    <div class="marker-image-holder top-overlay">
      <img
        src="${baseIcon}"
        alt="${baseIcon}"
        style="
          width: ${baseSize}px;
          height: ${baseSize}px;
          bottom: ${2 + stationMod.offsetY}px;
          left: ${stationMod.offsetX * 50}%;
          transform: translateX(-50%);
        "
      />
     ${
       is_battle_available &&
       /* html */ `
        <img
            src="${battleIcon}"
            alt="${battleIcon}"
            style="
            opacity: ${getOpacity(0)};
            width: ${battleSize}px;
            height: ${battleSize}px;
            bottom: ${baseSize * 0.4 * battleMod.offsetY}px;
            left: ${battleMod.offsetX * 55}%;
            transform: translateX(-50%);
          "
        />
      `
     }
    </div>
`,
  })
}
