import React, { useEffect, useCallback } from 'react'
import MarkerClusterGroup from 'react-leaflet-markercluster'
import { useQuery } from '@apollo/client'
import { useMap } from 'react-leaflet'

import { useMasterfile } from '../hooks/useStore'
import Query from '../services/Query'
import * as index from './tiles/index'

export default function QueryData({
  bounds, filters, onMove, perms, category,
}) {
  const Component = index[category]
  const zoomLevel = useMasterfile(state => state.config).map.clusterZoomLevels[category] || 1
  const map = useMap()
  const ts = Math.floor((new Date()).getTime() / 1000)

  const trimFilters = useCallback(requestedFilters => {
    const trimmed = {}
    Object.entries(requestedFilters).forEach(topLevelFilter => {
      const [id, specifics] = topLevelFilter

      if (id !== 'filter' && id !== 'enabled') {
        trimmed[`only${id.charAt(0).toUpperCase()}${id.slice(1)}`] = specifics
      }
    })
    Object.entries(requestedFilters.filter).forEach(filter => {
      const [id, specifics] = filter

      if (specifics.enabled) {
        trimmed[id] = specifics
      }
    })
    return trimmed
  }, [])

  const getId = useCallback((component, item) => {
    switch (component) {
      default: return `${item.id}-${item.updated}`
      case 'devices': return `${item.uuid}-${item.last_seen}`
      case 'submissionCells': return component
    }
  }, [])

  const refetchData = () => {
    onMove()
    const mapBounds = map.getBounds()
    refetch({
      minLat: mapBounds._southWest.lat,
      maxLat: mapBounds._northEast.lat,
      minLon: mapBounds._southWest.lng,
      maxLon: mapBounds._northEast.lng,
      filters: trimFilters(filters),
    })
  }

  useEffect(() => {
    map.on('moveend', refetchData)
    return () => {
      map.off('moveend', refetchData)
    }
  }, [map, filters])

  const { data, previousData, refetch } = useQuery(Query[category](filters, perms), {
    variables: {
      ...bounds,
      filters: trimFilters(filters),
    },
  })
  const renderedData = data || previousData

  return (
    <MarkerClusterGroup disableClusteringAtZoom={zoomLevel}>
      {renderedData && renderedData[category].map(each => (
        <Component
          key={getId(category, each)}
          item={each}
          ts={ts}
          filters={filters}
          map={map}
        />
      ))}
    </MarkerClusterGroup>
  )
}
