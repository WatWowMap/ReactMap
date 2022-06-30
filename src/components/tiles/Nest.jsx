import React, { memo, useRef, useState } from 'react'
import { Polygon, Marker, Popup } from 'react-leaflet'

import useForcePopup from '@hooks/useForcePopup'
import { useStatic } from '@hooks/useStore'

import nestMarker from '../markers/nest'
import PopupContent from '../popups/Nest'

const NestTile = ({ item, filters, Icons, ts, params, setParams }) => {
  const markerRef = useRef({})
  const [done, setDone] = useState(false)
  const { pokemon } = useStatic((state) => state.masterfile)

  const iconUrl = Icons.getPokemon(item.pokemon_id, item.pokemon_form)
  const parsedJson = JSON.parse(item.polygon_path)
  const recent = ts - item.updated < 172800000

  useForcePopup(item.id, markerRef, params, setParams, done)

  return (
    <>
      {filters.pokemon && (
        <Marker
          ref={(m) => {
            markerRef.current[item.id] = m
            if (!done && item.id === params.id) {
              setDone(true)
            }
          }}
          position={[item.lat, item.lon]}
          icon={nestMarker(
            iconUrl,
            item,
            pokemon[item.pokemon_id],
            filters,
            Icons,
            recent,
          )}
        >
          <Popup position={[item.lat, item.lon]}>
            <PopupContent
              nest={item}
              iconUrl={iconUrl}
              pokemon={item}
              recent={recent}
            />
          </Popup>
        </Marker>
      )}
      {parsedJson &&
        filters.polygons &&
        parsedJson.map((polygon) => (
          <Polygon positions={polygon} key={polygon} />
        ))}
    </>
  )
}

const areEqual = (prev, next) =>
  prev.item.id === next.item.id &&
  prev.item.updated === next.item.updated &&
  prev.filters.pokemon === next.filters.pokemon &&
  prev.filters.polygons === next.filters.polygons

export default memo(NestTile, areEqual)
