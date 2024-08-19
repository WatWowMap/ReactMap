// @ts-check
/* eslint-disable react/destructuring-assignment */

import * as React from 'react'
import { GeoJSON, Marker } from 'react-leaflet'

import { basicEqualFn, useMemory } from '@store/useMemory'
import { useStorage } from '@store/useStorage'
import { useForcePopup } from '@hooks/useForcePopup'

import { nestMarker } from './nestMarker'
import { NestPopup } from './NestPopup'

/**
 *
 * @param {import('@rm/types').Nest} nest
 * @returns
 */
const BaseNestTile = (nest) => {
  const recent = Date.now() / 1000 - nest.updated < 172800000
  const internalId = `${nest.pokemon_id}-${nest.pokemon_form}`

  const size = useStorage(
    (s) => s.filters.nests.filter[internalId]?.size || 'md',
  )
  const [iconUrl, iconSize] = useMemory((s) => {
    const { Icons } = s
    return [
      Icons.getPokemon(nest.pokemon_id, nest.pokemon_form),
      Icons.getSize('nest', size),
    ]
  }, basicEqualFn)

  return (
    <>
      {nest.pokemon_id && (
        <NestMarker
          iconUrl={iconUrl}
          iconSize={iconSize}
          recent={recent}
          nest={nest}
        >
          <NestPopup iconUrl={iconUrl} recent={recent} {...nest} />
        </NestMarker>
      )}
      <NestGeoJSON polygon_path={nest.polygon_path}>
        <NestPopup iconUrl={iconUrl} recent={recent} {...nest} />
      </NestGeoJSON>
    </>
  )
}

/**
 *
 * @param {Omit<import('react-leaflet').MarkerProps, 'position'> & {
 *  children: React.ReactNode
 *  iconUrl: string
 *  iconSize: number
 *  recent: boolean
 *  nest: import('@rm/types').Nest
 * }} props
 * @returns
 */
const NestMarker = ({
  children,
  iconSize,
  iconUrl,
  recent,
  nest,
  ...props
}) => {
  const showPokemon = useStorage((s) => s.filters.nests.pokemon)
  const [markerRef, setMarkerRef] = React.useState(null)

  useForcePopup(nest.id, markerRef)

  const icon = React.useMemo(
    () =>
      nestMarker({
        iconUrl,
        iconSize,
        pokemonId: nest.pokemon_id,
        formId: nest.pokemon_form,
        recent,
      }),
    [iconUrl, iconSize, nest.pokemon_id, nest.pokemon_form, recent],
  )

  if (!showPokemon) {
    return null
  }
  return (
    <Marker
      ref={setMarkerRef}
      position={[nest.lat, nest.lon]}
      icon={icon}
      {...props}
    >
      {children}
    </Marker>
  )
}

/**
 *
 * @param {{ polygon_path: string, children?: React.ReactNode }} props
 * @returns
 */
const NestGeoJSON = ({ polygon_path, children }) => {
  const showPolygons = useStorage((s) => s.filters.nests.polygons)

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
  return <GeoJSON data={geometry}>{children}</GeoJSON>
}

export const NestTile = React.memo(
  BaseNestTile,
  (prev, next) => prev.updated === next.updated && prev.name === next.name,
)
