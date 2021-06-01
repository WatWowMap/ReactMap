import React, { useEffect, useCallback } from 'react'
import { useQuery } from '@apollo/client'
import { useMap } from 'react-leaflet'
import { useStatic } from '@hooks/useStore'
import Query from '@services/Query'
import Clustering from './Clustering'

const withAvailableList = ['pokestops', 'gyms', 'nests']

const getPolling = cat => {
  switch (cat) {
    default: return 0
    case 'device': return 10000
    case 'gyms': return 10000
    case 'pokestops': return 300000
    case 'weather': return 30000
  }
}

export default function QueryData({
  bounds, filters, onMove, perms, category, userSettings, iconSizes, path, availableForms, tileStyle,
}) {
  const zoomLevel = useStatic(state => state.config).map.clusterZoomLevels[category] || 1
  const available = useStatic(state => state.available)
  const { [category]: { filter: staticFilters } } = useStatic(state => state.filters)

  const map = useMap()

  const trimFilters = useCallback(requestedFilters => {
    const trimmed = {
      onlyLegacyExclude: [],
      onlyLegacy: userSettings.legacyFilter,
    }
    Object.entries(requestedFilters).forEach(topLevelFilter => {
      const [id, specifics] = topLevelFilter

      if (id !== 'filter' && id !== 'enabled' && id !== 'legacy') {
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
      } else if (category === 'pokemon' && userSettings.legacyFilter) {
        trimmed.onlyLegacyExclude.push(id)
      }
    })
    return trimmed
  }, [userSettings])

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
    <>
      {renderedData && (
        <Clustering
          renderedData={renderedData[category]}
          zoomLevel={zoomLevel}
          map={map}
          filters={filters}
          iconSizes={iconSizes}
          path={path}
          tileStyle={tileStyle}
          availableForms={availableForms}
          userSettings={userSettings}
          perms={perms}
          category={category}
        />
      )}
    </>
  )
}
