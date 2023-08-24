// @ts-check
import * as React from 'react'
import { GeoJSON, Marker, Popup } from 'react-leaflet'

import { basicEqualFn, useStatic, useStore } from '@hooks/useStore'

import nestMarker from '../markers/nest'
import PopupContent from '../popups/Nest'

/**
 *
 * @param {import('@rm/types').Nest & { force?: boolean }} props
 * @returns
 */
const NestTile = ({ force, ...nest }) => {
  const recent = Date.now() / 1000 - nest.updated < 172800000

  const [excluded, iconUrl, iconSize] = useStatic((s) => {
    const internalId = `${nest.pokemon_id}-${nest.pokemon_form}`
    const { Icons, excludeList } = s
    const filter = useStore.getState().filters.nests.filter[internalId]
    return [
      excludeList.includes(internalId),
      Icons.getPokemon(nest.pokemon_id, nest.pokemon_form),
      Icons.getSize('nest', filter),
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
      <NestMarker force={force} icon={icon} lat={nest.lat} lon={nest.lon}>
        <Popup position={[nest.lat, nest.lon]}>
          <PopupContent
            nest={nest}
            iconUrl={iconUrl}
            pokemon={nest}
            recent={recent}
          />
        </Popup>
      </NestMarker>
      <NestGeoJSON polygon_path={nest.polygon_path} />
    </>
  )
}

/**
 *
 * @param {Omit<import('react-leaflet').MarkerProps, 'position'> & {
 *  force?: boolean
 *  children: React.ReactNode
 *  lat: number
 *  lon: number
 * }} props
 * @returns
 */
const NestMarker = ({ force, children, icon, lat, lon }) => {
  const showPokemon = useStore((s) => s.filters.nests.pokemon)
  const [done, setDone] = React.useState(false)
  const markerRef = React.useRef(null)

  React.useEffect(() => {
    if (force && !done && markerRef.current) {
      markerRef.current.openPopup()
      setDone(true)
    }
  }, [force])

  if (!showPokemon) {
    return null
  }
  return (
    <Marker ref={markerRef} position={[lat, lon]} icon={icon}>
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

export default React.memo(NestTile)
