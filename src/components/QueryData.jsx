import React, { useCallback, useEffect, useState } from 'react'
import { useQuery } from '@apollo/client'
import ReactGA from 'react-ga'

import Query from '@services/Query'
import RobustTimeout from '@classes/RobustTimeout'
import Clustering from './Clustering'

const withAvailableList = ['pokestops', 'gyms', 'nests']
const filterSkipList = ['filter', 'enabled', 'legacy']

const getPolling = category => {
  switch (category) {
    case 'device':
    case 'gyms':
    case 'pokemon':
      return 10 * 1000
    case 'pokestops': return 5 * 60 * 1000
    case 'weather': return 30 * 1000
    default: return 10 * 60 * 1000
  }
}

export default function QueryData({
  bounds, onMove, map, tileStyle, zoomLevel, config, params,
  category, available, filters, staticFilters, staticUserSettings,
  userSettings, perms, Icons, userIcons,
}) {
  ReactGA.event({
    category: 'Data',
    action: `${category} being fetched`,
    label: category,
    nonInteraction: true,
  })

  const [timeout] = useState(() => new RobustTimeout(getPolling(category)))

  const trimFilters = useCallback(requestedFilters => {
    const trimmed = {
      onlyLegacyExclude: [],
      onlyLegacy: userSettings.legacyFilter,
    }
    Object.entries(requestedFilters).forEach(topLevelFilter => {
      const [id, specifics] = topLevelFilter

      if (!filterSkipList.includes(id)) {
        trimmed[`only${id.charAt(0).toUpperCase()}${id.slice(1)}`] = specifics
      }
    })
    Object.entries(userSettings).forEach(([entryK, entryV]) => {
      if (entryK.startsWith('pvp')) {
        trimmed[`only${entryK.charAt(0).toUpperCase()}${entryK.slice(1)}`] = entryV
      }
    })
    Object.entries(requestedFilters.filter).forEach(filter => {
      const [id, specifics] = filter

      if (specifics && specifics.enabled && staticFilters[id]) {
        if (withAvailableList.includes(category)
          && !Number.isNaN(parseInt(id.charAt(0)))) {
          if (available.includes(id)) {
            trimmed[id] = specifics
          }
        } else {
          trimmed[id] = specifics
        }
      } else if (userSettings.legacyFilter) {
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
      timeout.doRefetch({
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
  }, [filters, userSettings])

  const { data, previousData, refetch } = useQuery(Query[category](filters, perms, map.getZoom(), zoomLevel), {
    context: {
      abortableContext: timeout, // will be picked up by AbortableClient
    },
    variables: {
      ...bounds,
      filters: trimFilters(filters),
    },
    fetchPolicy: 'cache-and-network',
  })
  timeout.setupTimeout(refetch)

  const renderedData = data || previousData
  return (
    <>
      {renderedData && (
        <Clustering
          renderedData={renderedData[category]}
          zoomLevel={zoomLevel}
          map={map}
          config={config}
          filters={filters}
          Icons={Icons}
          userIcons={userIcons}
          tileStyle={tileStyle}
          perms={perms}
          category={category}
          userSettings={userSettings}
          staticUserSettings={staticUserSettings}
          params={params}
        />
      )}
    </>
  )
}
