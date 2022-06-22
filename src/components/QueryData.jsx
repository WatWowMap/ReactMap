import React, { useCallback, useEffect } from 'react'
import { useQuery } from '@apollo/client'

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
  isNight,
  setExcludeList,
  setError,
  active,
  userAreas,
}) {
  const trimFilters = useCallback(
    (requestedFilters) => {
      const trimmed = {
        onlyLegacyExclude: [],
        onlyLegacy: userSettings.legacyFilter,
        onlyLinkGlobal: userSettings.linkGlobalAndAdvanced,
        userAreas,
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
        } else if (userSettings.legacyFilter) {
          trimmed.onlyLegacyExclude.push(id)
        }
      })
      return trimmed
    },
    [userSettings, filters, userAreas],
  )

  const refetchData = () => {
    onMove()
    if (
      category !== 'weather' &&
      category !== 'device' &&
      category !== 'scanAreas'
    ) {
      refetch({
        ...Utility.getQueryArgs(map),
        filters: trimFilters(filters),
        version: inject.VERSION,
      })
    }
  }

  useEffect(() => {
    map.on('moveend', refetchData)
    return () => {
      map.off('moveend', refetchData)
    }
  }, [filters, userSettings, userAreas])

  const { data, previousData, refetch, error } = useQuery(
    Query[category](filters, perms, map.getZoom(), clusteringRules.zoomLevel),
    {
      context: { timeout: (config.polling[category] || 10) * 1000 },
      variables: {
        ...bounds,
        filters: trimFilters(filters),
        version: inject.VERSION,
      },
      fetchPolicy: active ? 'cache-first' : 'cache-only',
      pollInterval: (config.polling[category] || 10) * 1000,
      skip: !active,
    },
  )

  useEffect(() => () => setExcludeList([]))

  if (error) {
    if (inject.DEVELOPMENT) {
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
    const message =
      error?.networkError?.result?.errors?.find(
        (x) => x?.message === 'old_client',
      )?.message || error?.message
    if (message === 'session_expired' || message === 'old_client') {
      setError(message)
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
        isNight={isNight}
        userAreas={userAreas}
      />
      {category === 'weather' && (
        <ActiveWeather
          Icons={Icons}
          isNight={isNight}
          weather={renderedData[category]}
          isMobile={isMobile}
          zoom={config.activeWeatherZoom}
          clickable={userSettings.clickableIcon}
          map={map}
        />
      )}
    </>
  )
}
