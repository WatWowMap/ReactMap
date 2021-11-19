import React, { useCallback, useEffect, useState } from 'react'
import { useQuery } from '@apollo/client'

import Query from '@services/Query'
import Utility from '@services/Utility'
import RobustTimeout from '@classes/RobustTimeout'

import Clustering from './Clustering'
import ScanArea from './tiles/ScanArea'
import Notification from './layout/general/Notification'

const withAvailableList = ['pokestops', 'gyms', 'nests']
const filterSkipList = ['filter', 'enabled', 'legacy']

const getPolling = category => {
  switch (category) {
    case 'devices':
    case 'gyms':
    case 's2cells':
      return 10 * 1000
    case 'pokemon':
      return 20 * 1000
    case 'pokestops': return 5 * 60 * 1000
    case 'weather': return 30 * 1000
    default: return 10 * 60 * 1000
  }
}

export default function QueryData({
  bounds, onMove, map, tileStyle, clusterZoomLvl, config, params,
  category, available, filters, staticFilters, staticUserSettings,
  userSettings, perms, Icons, userIcons, setParams, isNight,
}) {
  const [timeout] = useState(() => new RobustTimeout(getPolling(category)))

  const trimFilters = useCallback(requestedFilters => {
    const trimmed = {
      onlyLegacyExclude: [],
      onlyLegacy: userSettings.legacyFilter,
      onlyOrRaids: userSettings.raidsOr,
      onlyLinkGlobal: userSettings.linkGlobalAndAdvanced,
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
          if (available?.includes(id)) {
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
        zoom: Math.floor(map.getZoom()),
        ts: Math.floor(Date.now() / 1000),
        midnight: Utility.getMidnight(),
      })
    }
  }

  useEffect(() => {
    map.on('moveend', refetchData)
    return () => {
      map.off('moveend', refetchData)
    }
  }, [filters, userSettings, map.getZoom()])

  const {
    data, previousData, refetch, error,
  } = useQuery(Query[category](
    filters, perms, map.getZoom(), clusterZoomLvl,
  ), {
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
  if (error && process.env.NODE_ENV === 'development') {
    return (
      <Notification
        severity="error"
        i18nKey="server_dev_error_0"
        messages={[
          {
            key: 'error',
            variables: [error],
          },
        ]}
      />
    )
  }
  if (renderedData) {
    return category === 'scanAreas' ? (
      <ScanArea
        item={renderedData[category]}
      />
    ) : (
      <Clustering
        renderedData={renderedData[category]}
        clusterZoomLvl={clusterZoomLvl}
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
        setParams={setParams}
        isNight={isNight}
      />
    )
  }
  return null
}
