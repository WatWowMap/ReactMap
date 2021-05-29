import React, { memo } from 'react'
import { Polygon, Marker, Popup } from 'react-leaflet'

import { useStatic } from '@hooks/useStore'
import Utility from '@services/Utility'
import nestMarker from '../markers/nest'
import PopupContent from '../popups/Nest'

const NestTile = ({
  item, filters, iconSizes, path, availableForms, ts,
}) => {
  const { pokemon } = useStatic(state => state.masterfile)
  const iconUrl = `${path}/${Utility.getPokemonIcon(availableForms, item.pokemon_id, item.pokemon_form)}.png`
  const parsedJson = JSON.parse(item.polygon_path)
  const recent = ts - item.updated < 172800000

  return (
    <>
      {filters.pokemon && (
        <Marker
          position={[item.lat, item.lon]}
          icon={nestMarker(iconUrl, item, pokemon[item.pokemon_id], filters.filter, iconSizes, recent)}
        >
          <Popup position={[item.lat, item.lon]}>
            <PopupContent
              nest={item}
              iconUrl={iconUrl}
              pokemon={item.pokemon_id}
              recent={recent}
            />
          </Popup>
        </Marker>
      )}
      {parsedJson && filters.polygons && parsedJson.map(polygon => (
        <Polygon positions={polygon} key={polygon} />
      ))}
    </>
  )
}

const areEqual = (prev, next) => (
  prev.item.nest_id === next.item.nest_id
  && prev.item.updated === next.item.updated
  && prev.filters.pokemon === next.filters.pokemon
  && prev.filters.polygons === next.filters.polygons
  && prev.filters.filter[`${prev.item.pokemon_id}-${prev.item.pokemon_form}`].size
  === next.filters.filter[`${next.item.pokemon_id}-${next.item.pokemon_form}`].size
)

export default memo(NestTile, areEqual)
