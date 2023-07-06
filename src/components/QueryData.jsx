import React, { useState, useCallback, useEffect } from 'react'
import { useQuery } from '@apollo/client'
import RobustTimeout from '@services/apollo/RobustTimeout'

import { useStatic } from '@hooks/useStore'
import Query from '@services/Query'
import Utility from '@services/Utility'

import Clustering from './Clustering'
import Notification from './layout/general/Notification'
import ActiveWeather from './layout/general/ActiveWeather'

const filterSkipList = ['filter', 'enabled', 'legacy']

export default function QueryData({
  bounds,
  onMove,
  map,
  tileStyle,
  clusteringRules,
  config,
  params,
  isMobile,
  category,
  filters,
  staticFilters,
  staticUserSettings,
  sizeKey,
  userSettings,
  perms,
  Icons,
  userIcons,
  setParams,
  timeOfDay,
  setError,
  active,
  onlyAreas,
}) {
  const [timeout] = useState(
    () => new RobustTimeout((config.polling[category] || 10) * 1000),
  )

  const trimFilters = useCallback(
    (requestedFilters) => {
      const trimmed = {
        onlyLegacy: userSettings.legacyFilter,
        onlyLinkGlobal: userSettings.linkGlobalAndAdvanced,
        onlyAllPvp: userSettings.showAllPvpRanks,
        onlyAreas,
      }
      Object.entries(requestedFilters).forEach((topLevelFilter) => {
        const [id, specifics] = topLevelFilter

        if (!filterSkipList.includes(id)) {
          trimmed[`only${id.charAt(0).toUpperCase()}${id.slice(1)}`] = specifics
        }
      })
      Object.entries(userSettings).forEach(([entryK, entryV]) => {
        if (entryK.startsWith('pvp')) {
          trimmed[`only${entryK.charAt(0).toUpperCase()}${entryK.slice(1)}`] =
            entryV
        }
      })
      Object.entries(requestedFilters.filter).forEach((filter) => {
        const [id, specifics] = filter

        if (specifics && specifics.enabled && staticFilters[id]) {
          trimmed[id] = specifics
        }
      })
      return trimmed
    },
    [userSettings, filters, onlyAreas],
  )

  useEffect(() => {
    const refetchData = () => {
      onMove()
      if (category !== 'device' && category !== 'scanAreas') {
        timeout.doRefetch({
          ...Utility.getQueryArgs(map),
          filters: trimFilters(filters),
        })
      }
    }

    map.on('moveend', refetchData)
    return () => {
      map.off('moveend', refetchData)
    }
  }, [filters, userSettings, onlyAreas])

  const { data, previousData, refetch, error } = useQuery(
    Query[category](filters, perms, map.getZoom(), clusteringRules.zoomLevel),
    {
      context: {
        abortableContext: timeout,
      },
      variables: {
        ...bounds,
        filters: trimFilters(filters),
      },
      fetchPolicy: active ? 'cache-first' : 'cache-only',
      // pollInterval: (config.polling[category] || 10) * 1000,
      skip: !active,
    },
  )
  timeout.setupTimeout(refetch)

  useEffect(() => () => useStatic.setState({ excludeList: [] }))

  if (error) {
    if (error.networkError?.statusCode === 464) {
      setError('old_client')
      return null
    }
    if (error.networkError?.statusCode === 401) {
      setError('session_expired')
      return null
    }
  }

  const renderedData = data || previousData || { [category]: [] }
  return (
    <>
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
        timeOfDay={timeOfDay}
        onlyAreas={onlyAreas}
      />
      {category === 'weather' && (
        <ActiveWeather
          Icons={Icons}
          timeOfDay={timeOfDay}
          weather={renderedData[category]}
          isMobile={isMobile}
          zoom={config.activeWeatherZoom}
          clickable={userSettings.clickableIcon}
          map={map}
        />
      )}
      {process.env.NODE_ENV === 'development' && error && (
        <Notification
          severity="error"
          i18nKey="server_dev_error_0"
          messages={[
            {
              key: 'error',
              variables: [error?.message],
            },
          ]}
        />
      )}
    </>
  )
}
