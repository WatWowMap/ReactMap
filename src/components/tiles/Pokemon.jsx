import React, { useCallback, memo } from 'react'
import { Marker, Popup } from 'react-leaflet'

import { useStatic } from '@hooks/useStore'
import Utility from '@services/Utility'
import PopupContent from '../popups/Pokemon'
import { basicMarker, fancyMarker } from '../markers/pokemon'
import Timer from './Timer'

const PokemonTile = ({
  item, showTimer, filters, iconSizes, path, availableForms, excludeList,
}) => {
  const { map: { theme: { glow } } } = useStatic(useCallback(state => state.config))
  const iconUrl = `${path}/${Utility.getPokemonIcon(availableForms, item.pokemon_id, item.form, 0, 0, item.costume)}.png`

  const getPvpStatus = () => {
    if (item.rankSum) {
      if (item.rankSum.best <= glow.pvp.value || item.rankSum.best <= 3) {
        return item.rankSum.best
      }
    }
  }
  const bestPvp = getPvpStatus()

  return (
    <>
      {!excludeList.includes(`${item.pokemon_id}-${item.form}`) && (
        <Marker
          position={[item.lat, item.lon]}
          icon={(bestPvp || item.iv >= 100)
            ? fancyMarker(iconUrl, item, bestPvp, filters, iconSizes, glow)
            : basicMarker(iconUrl, item, filters, iconSizes)}
        >
          <Popup position={[item.lat, item.lon]}>
            <PopupContent pokemon={item} iconUrl={iconUrl} />
          </Popup>
          {showTimer && <Timer timestamp={item.expire_timestamp} direction="center" />}
        </Marker>
      )}
    </>
  )
}

const areEqual = (prev, next) => (
  prev.item.id === next.item.id
    && prev.item.updated === next.item.updated
    && prev.showTimer === next.showTimer
    && prev.filters.filter[`${prev.item.pokemon_id}-${prev.item.form}`].size === next.filters.filter[`${next.item.pokemon_id}-${next.item.form}`].size
    && !next.excludeList.includes(`${prev.item.pokemon_id}-${prev.item.form}`)
    && prev.path === next.path
)

export default memo(PokemonTile, areEqual)
