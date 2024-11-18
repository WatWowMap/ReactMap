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
export function useStationMarker({
  battle_level,
  battle_pokemon_alignment,
  battle_pokemon_costume,
  battle_pokemon_form,
  battle_pokemon_gender,
  battle_pokemon_id,
  is_battle_available,
  battle_pokemon_bread_mode,
  start_time,
  end_time,
}) {
  const [, Icons] = useStorage(
    (s) => [s.icons, useMemory.getState().Icons],
    (a, b) => Object.entries(a[0]).every(([k, v]) => b[0][k] === v),
  )
  const [baseIcon, baseSize, battleIcon, battleSize] = useStorage((s) => {
    const { filter } = s.filters.stations
    return [
      Icons.getStation(start_time < Date.now() / 1000),
      Icons.getSize('station', filter[`j${battle_level}`]?.size),
      Icons.getPokemon(
        battle_pokemon_id,
        battle_pokemon_form,
        0,
        battle_pokemon_gender,
        battle_pokemon_costume,
        battle_pokemon_alignment,
        false,
        battle_pokemon_bread_mode,
      ),
      Icons.getSize(
        'dynamax',
        filter[`${battle_pokemon_id}-${battle_pokemon_form}`]?.size,
      ),
    ]
  }, basicEqualFn)
  const [stationMod, battleMod] = Icons.getModifiers('station', 'dynamax')
  const opacity = useOpacity('stations')(end_time)
  const isActive = start_time < Date.now() / 1000

  return divIcon({
    popupAnchor: [
      0 + stationMod.popupX + stationMod.offsetX,
      (-baseSize - (is_battle_available && isActive ? battleSize : 0)) * 0.67 +
        stationMod.popupY +
        stationMod.offsetY +
        (-5 + battleMod.offsetY + battleMod.popupY),
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
          opacity: ${opacity};
          bottom: ${2 + stationMod.offsetY}px;
          left: ${stationMod.offsetX * 50}%;
          transform: translateX(-50%);
        "
      />
     ${
       is_battle_available && isActive
         ? /* html */ `
        <img
            src="${battleIcon}"
            alt="${battleIcon}"
            style="
            opacity: ${opacity};
            width: ${battleSize}px;
            height: ${battleSize}px;
            bottom: ${baseSize * 0.8 * battleMod.offsetY}px;
            left: ${battleMod.offsetX * 55}%;
            transform: translateX(-50%);
          "
        />
      `
         : ''
     }
    </div>
`,
  })
}
