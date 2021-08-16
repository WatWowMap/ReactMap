import React, {
  memo, useState, useEffect, useRef,
} from 'react'
import { Polygon, Marker, Popup } from 'react-leaflet'

import { useStatic } from '@hooks/useStore'
import nestMarker from '../markers/nest'
import PopupContent from '../popups/Nest'

const NestTile = ({
  item, filters, Icons, ts, params,
}) => {
  const [done, setDone] = useState(false)
  const markerRefs = useRef({})
  const { pokemon } = useStatic(state => state.masterfile)
  const iconUrl = Icons.getPokemon(item.pokemon_id, item.pokemon_form)
  const parsedJson = JSON.parse(item.polygon_path)
  const recent = ts - item.updated < 172800000

  useEffect(() => {
    const { id } = params
    if (id === item.nest_id) {
      const markerToOpen = markerRefs.current[id]
      markerToOpen.openPopup()
    }
  }, [done])

  return (
    <>
      {filters.pokemon && (
        <Marker
          ref={(m) => {
            markerRefs.current[item.nest_id] = m
            if (!done && item.nest_id === params.id) {
              setDone(true)
            }
          }}
          position={[item.lat, item.lon]}
          icon={nestMarker(iconUrl, item, pokemon[item.pokemon_id], filters, Icons, recent)}
        >
          <Popup position={[item.lat, item.lon]} onClose={() => delete params.id}>
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
