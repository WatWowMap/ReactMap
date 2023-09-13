/* eslint-disable react/destructuring-assignment */
// @ts-check
import * as React from 'react'
import { GeoJSON, Marker, Popup } from 'react-leaflet'

import { basicEqualFn, useStatic, useStore } from '@hooks/useStore'
import useForcePopup from '@hooks/useForcePopup'

import nestMarker from '../markers/nest'
import PopupContent from '../popups/Nest'

/**
 *
 * @param {import('@rm/types').Nest} nest
 * @returns
 */
const NestTile = (nest) => {
  const recent = Date.now() / 1000 - nest.updated < 172800000
  const internalId = `${nest.pokemon_id}-${nest.pokemon_form}`

  const size = useStore((s) => s.filters.nests.filter[internalId]?.size || 'md')
  const [excluded, iconUrl, iconSize] = useStatic((s) => {
    const { Icons, excludeList } = s
    return [
      excludeList.includes(internalId),
      Icons.getPokemon(nest.pokemon_id, nest.pokemon_form),
      Icons.getSize('nest', size),
    ]
  }, basicEqualFn)

  const icon = React.useMemo(
    () =>
      nestMarker({
        iconUrl,
        iconSize,
        pokemonId: nest.pokemon_id,
        formId: nest.pokemon_form,
        recent,
      }),
    [iconUrl, iconSize, nest.pokemon_id, recent],
  )
  if (excluded) {
    return null
  }

  return (
    <>
      <NestMarker icon={icon} id={nest.id} lat={nest.lat} lon={nest.lon}>
        <Popup position={[nest.lat, nest.lon]}>
          <PopupContent iconUrl={iconUrl} recent={recent} {...nest} />
        </Popup>
      </NestMarker>
      <NestGeoJSON polygon_path={nest.polygon_path} />
    </>
  )
}

/**
 *
 * @param {Omit<import('react-leaflet').MarkerProps, 'position'> & {
 *  children: React.ReactNode
 *  id: number
 *  lat: number
 *  lon: number
 * }} props
 * @returns
 */
const NestMarker = ({ children, icon, id, lat, lon }) => {
  const showPokemon = useStore((s) => s.filters.nests.pokemon)
  const [markerRef, setMarkerRef] = React.useState(null)

  useForcePopup(id, markerRef)

  if (!showPokemon) {
    return null
  }
  return (
    <Marker ref={setMarkerRef} position={[lat, lon]} icon={icon}>
      {children}
    </Marker>
  )
}

/**
 *
 * @param {{ polygon_path: string }} props
 * @returns
 */
const NestGeoJSON = ({ polygon_path }) => {
  const showPolygons = useStore((s) => s.filters.nests.polygons)

  const geometry = React.useMemo(() => {
    try {
      return typeof polygon_path === 'string'
        ? JSON.parse(polygon_path)
        : polygon_path
    } catch (e) {
      return null
    }
  }, [polygon_path])

  if (!showPolygons) {
    return null
  }
  return <GeoJSON data={geometry} />
}

const MemoNestTile = React.memo(
  NestTile,
  (prev, next) => prev.updated === next.updated,
)

export default MemoNestTile
