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

  return (
    <Marker
      position={[item.lat, item.lon]}
      icon={marker(iconUrl)}
    >
      <Popup
        position={[item.lat, item.lon]}
        style={{ backgroundColor: 'rgb(33, 37, 31)' }}
      >
        <PopupContent pokemon={item} iconUrl={iconUrl} />
      </Popup>
      {showTimer && <Timer item={item} />}
    </Marker>
  )
}

const areEqual = (prev, next) => (
  prev.item.id === next.item.id
  && prev.item.updated === next.item.updated
  && prev.showTimer === next.showTimer
)

export default memo(PokemonTile, areEqual)
