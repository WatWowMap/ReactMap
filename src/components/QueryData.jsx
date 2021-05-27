import React, { useEffect, useCallback } from 'react'
import MarkerClusterGroup from 'react-leaflet-markercluster'
import { useQuery } from '@apollo/client'
import { useMap } from 'react-leaflet'

import { useStatic } from '@hooks/useStore'
import Query from '@services/Query'
import * as index from './tiles/index'

const withAvailableList = ['pokestops', 'gyms', 'nests']

export default function QueryData({
  bounds, filters, onMove, perms, category, iconSizes, path, availableForms, tileStyle,
}) {
  const Component = index[category]
  const zoomLevel = useStatic(state => state.config).map.clusterZoomLevels[category] || 1
  const hideList = useStatic(state => state.hideList)
  const excludeList = useStatic(state => state.excludeList)
  const timerList = useStatic(state => state.timerList)
  const available = useStatic(state => state.available)
  const { [category]: { filter: staticFilters } } = useStatic(state => state.staticFilters)

  const map = useMap()
  const ts = Math.floor((new Date()).getTime() / 1000)

  const trimFilters = useCallback(requestedFilters => {
    const trimmed = {
      onlyLegacyExclude: [],
    }
    Object.entries(requestedFilters).forEach(topLevelFilter => {
      const [id, specifics] = topLevelFilter

      if (id !== 'filter' && id !== 'enabled') {
        trimmed[`only${id.charAt(0).toUpperCase()}${id.slice(1)}`] = specifics
      }
    })
    Object.entries(requestedFilters.filter).forEach(filter => {
      const [id, specifics] = filter

      if (specifics && specifics.enabled && staticFilters[id]) {
        if (withAvailableList.includes(category)
          && !Number.isNaN(parseInt(id.charAt(0)))) {
          if (available[category].includes(id)) {
            trimmed[id] = specifics
          }
        } else {
          trimmed[id] = specifics
        }
      } else if (category === 'pokemon' && filters.legacy) {
        trimmed.onlyLegacyExclude.push(id)
      }
    })
    return trimmed
  }, [])

  const getId = useCallback((component, item) => {
    switch (component) {
      default: return `${item.id}-${item.updated}`
      case 'devices': return `${item.uuid}-${item.last_seen}`
      case 'submissionCells': return component
      case 'nests': return `${item.nest_id}-${item.updated}`
      case 'scanAreas': return item.properties.name
    }
  }, [])

  const refetchData = () => {
    onMove()
    const mapBounds = map.getBounds()
    if (category !== 'weather'
      && category !== 'device'
      && category !== 'scanAreas') {
      refetch({
        minLat: mapBounds._southWest.lat,
        maxLat: mapBounds._northEast.lat,
        minLon: mapBounds._southWest.lng,
        maxLon: mapBounds._northEast.lng,
        filters: trimFilters(filters),
      })
    }
  }

  const getPolling = useCallback(cat => {
    switch (cat) {
      default: return 0
      case 'device': return 10000
      case 'gyms': return 10000
      case 'pokestops': return 300000
      case 'weather': return 30000
    }
  }, [])

  useEffect(() => {
    map.on('moveend', refetchData)
    return () => {
      map.off('moveend', refetchData)
    }
  }, [filters])

  const { data, previousData, refetch } = useQuery(Query[category](filters, perms, map.getZoom(), zoomLevel), {
    variables: {
      ...bounds,
      filters: trimFilters(filters),
    },
    fetchPolicy: 'cache-and-network',
    pollInterval: getPolling(category),
  })
  const renderedData = data || previousData

  return (
    <MarkerClusterGroup disableClusteringAtZoom={zoomLevel}>
      {renderedData && renderedData[category].map(each => {
        if (!hideList.includes(each.id)) {
          return (
            <Component
              key={getId(category, each)}
              item={each}
              ts={ts}
              filters={filters}
              map={map}
              iconSizes={iconSizes}
              showTimer={timerList.includes(each.id)}
              path={path}
              availableForms={availableForms}
              perms={perms}
              tileStyle={tileStyle}
              excludeList={excludeList}
            />
          )
        }
        return ''
      })}
    </MarkerClusterGroup>
  )
}
