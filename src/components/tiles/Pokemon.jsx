import React, { memo } from 'react'
import { Marker, Popup } from 'react-leaflet'
import PopupContent from '../popups/Pokemon'
import marker from '../markers/pokemon'

const PokemonTile = ({ item }) => (
  <Marker
    position={[item.lat, item.lon]}
    icon={marker(item)}
  >
    <Popup position={[item.lat, item.lon]}>
      <PopupContent pokemon={item} />
    </Popup>
  </Marker>
)

const areEqual = (prev, next) => (
  prev.item.id === next.item.id
  && prev.item.updated === next.item.updated
)

export default memo(PokemonTile, areEqual)
