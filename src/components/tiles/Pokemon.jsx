import React, { useCallback, memo } from 'react'
import { Marker, Popup } from 'react-leaflet'

import { useStore, useMasterfile } from '../../hooks/useStore'
import Utility from '../../services/Utility'
import PopupContent from '../popups/Pokemon'
import marker from '../markers/pokemon'
import Timer from './Timer'

const PokemonTile = ({ item, showTimer }) => {
  const { path } = useStore(useCallback(state => state.settings)).icons
  const availableForms = useMasterfile(useCallback(state => state.availableForms))
  const iconUrl = `${path}/${Utility.getPokemonIcon(availableForms, item.pokemon_id, item.form, 0, 0, item.costume)}.png`

  const getBestWorst = (league) => {
    let best = 4096
    let worst = 1
    if (league !== null) {
      league.forEach(pkmn => {
        best = pkmn.rank < best ? pkmn.rank : best
        worst = pkmn.rank > worst ? pkmn.rank : worst
      })
    } else {
      best = undefined
      worst = undefined
    }
    return { best, worst }
  }

  const pvpRankInfo = {
    great: getBestWorst(item.great),
    ultra: getBestWorst(item.ultra),
  }

  return (
    <Marker
      position={[item.lat, item.lon]}
      icon={marker(iconUrl, item, pvpRankInfo)}
    >
      <Popup
        position={[item.lat, item.lon]}
        style={{ backgroundColor: 'rgb(33, 37, 31)' }}
      >
        <PopupContent pokemon={item} iconUrl={iconUrl} pvpRankInfo={pvpRankInfo} />
      </Popup>
      {showTimer && <Timer timestamp={item.expire_timestamp} />}
    </Marker>
  )
}

const areEqual = (prev, next) => (
  prev.item.id === next.item.id
  && prev.item.updated === next.item.updated
  && prev.showTimer === next.showTimer
)

export default memo(PokemonTile, areEqual)
