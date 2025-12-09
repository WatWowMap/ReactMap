// @ts-check
import { divIcon } from 'leaflet'

import { basicEqualFn, useMemory } from '@store/useMemory'
import { useStorage } from '@store/useStorage'
import { useOpacity } from '@hooks/useOpacity'
import { renderOverlayIcon } from '@utils/renderOverlayIcon'

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
  battle_pokemon_bread_mode,
  battle_end,
  start_time,
  end_time,
}) {
  const now = Date.now() / 1000
  const isInactive = Number.isFinite(end_time) && end_time < now
  const hasStarted = Number.isFinite(start_time) && start_time < now
  const isBattleActive = Number.isFinite(battle_end) && battle_end > now
  const [, Icons] = useStorage(
    (s) => [s.icons, useMemory.getState().Icons],
    (a, b) => Object.entries(a[0]).every(([k, v]) => b[0][k] === v),
  )
  const [baseIcon, baseSize, battleIcon, battleSize] = useStorage((s) => {
    const { filter } = s.filters.stations
    return [
      Icons.getStation(isInactive ? false : hasStarted),
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
  const getOpacity = useOpacity('stations')
  const stationOpacity = isInactive ? 0.3 : getOpacity(end_time)
  const showBattleIcon =
    !isInactive && !!battle_pokemon_id && hasStarted && isBattleActive

  return divIcon({
    popupAnchor: [
      0 + stationMod.popupX + stationMod.offsetX,
      (-baseSize - (showBattleIcon ? battleSize : 0)) * 0.67 +
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
          opacity: ${stationOpacity};
          bottom: ${2 + stationMod.offsetY}px;
          left: ${stationMod.offsetX * 50}%;
          transform: translateX(-50%);
        "
      />
     ${
       showBattleIcon
         ? /* html */ renderOverlayIcon({
             url: battleIcon,
             size: battleSize,
             opacity: getOpacity(battle_end),
             bottom: baseSize * 0.8 * battleMod.offsetY,
             left: battleMod.offsetX * 50,
           })
         : ''
     }
    </div>
`,
  })
}
