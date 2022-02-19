import React, { useCallback, useEffect } from 'react'
import { useQuery } from '@apollo/client'

import Query from '@services/Query'
import Utility from '@services/Utility'

import Clustering from './Clustering'
import Notification from './layout/general/Notification'

const withAvailableList = ['pokestops', 'gyms', 'nests']
const filterSkipList = ['filter', 'enabled', 'legacy']

const getPolling = category => {
  switch (category) {
    case 'devices':
    case 'gyms':
    case 'scanCells':
      return 10 * 1000
    case 'pokemon':
      return 20 * 1000
    case 'pokestops': return 5 * 60 * 1000
    case 'weather': return 30 * 1000
    default: return 10 * 60 * 1000
  }
}

export default function QueryData({
  bounds, onMove, map, tileStyle, clusteringRules, config, params,
  category, available, filters, staticFilters, staticUserSettings, sizeKey,
  userSettings, perms, Icons, userIcons, setParams, isNight, setExcludeList,
}) {
  const trimFilters = useCallback(requestedFilters => {
    const trimmed = {
      onlyLegacyExclude: [],
      onlyLegacy: userSettings.legacyFilter,
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
  }, [userSettings, filters])

  const refetchData = () => {
    onMove()
    if (category !== 'weather'
      && category !== 'device'
      && category !== 'scanAreas') {
      refetch({
        ...Utility.getQueryArgs(map),
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

  const { data, previousData, refetch, error } = useQuery(
    Query[category](filters, perms, map.getZoom(), clusteringRules.zoomLevel),
    {
      context: { timeout: getPolling(category) },
      variables: {
        ...bounds,
        filters: trimFilters(filters),
      },
      fetchPolicy: 'cache-and-network',
      pollInterval: getPolling(category),
    },
  )

  useEffect(() => () => setExcludeList([]))

  const renderedData = data || previousData || {}
  if (error && inject.DEVELOPMENT) {
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
  return renderedData[category] ? (
    <Clustering
      key={sizeKey}
      renderedData={renderedData[category]}
      clusteringRules={clusteringRules}
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
  ) : null
}
