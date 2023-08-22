import { useEffect, useRef } from 'react'

import RobustTimeout from '@services/apollo/RobustTimeout'

import { useQuery } from '@apollo/client'
import Query from '@services/Query'
import { getQueryArgs } from '@services/functions/getQueryArgs'

import { useStatic, useStore } from './useStore'

const filterSkipList = ['filter', 'enabled', 'legacy']

/** @param {string} category */
const userSettingsCategory = (category) => {
  switch (category) {
    case 'devices':
    case 'spawnpoints':
    case 'scanCells':
      return 'admin'
    case 'submissionCells':
    case 'portals':
      return 'wayfarer'
    default:
      return category
  }
}

const trimFilters = (requestedFilters, userSettings, category, onlyAreas) => {
  const { filters: staticFilters } = useStatic.getState()
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

    if (specifics && specifics.enabled && staticFilters[category]?.filter[id]) {
      trimmed[id] = specifics
    }
  })
  return trimmed
}

export function useQueryWithTimeout(category, perms) {
  const {
    config: {
      map: {
        polling,
        clustering: { [category]: clustering },
        minZoom,
      },
    },
  } = useStatic.getState()

  const timeout = useRef(new RobustTimeout((polling || 10) * 1000) || {})
  // const location = useStore((s) => s.location)
  const zoom = useStore((s) => s.zoom)

  const userSettings = useStore(
    (s) => s.userSettings[userSettingsCategory(category)] || {},
  )
  const filters = useStore((s) => s.filters[category])
  const onlyAreas = useStore(
    (s) =>
      (s.filters?.scanAreas?.filterByAreas &&
        filters?.scanAreas?.filter?.areas) ||
      [],
  )

  const active = useStatic((state) => state.active)

  const { data, previousData, refetch, error, loading } = useQuery(
    Query[category](filters, perms, zoom, clustering?.zoomLevel || minZoom),
    {
      context: {
        abortableContext: timeout.current,
      },
      variables: {
        ...getQueryArgs(),
        filters: trimFilters(filters, userSettings, category, onlyAreas),
      },
      fetchPolicy: active ? 'cache-first' : 'cache-only',
      // skip: !active,
    },
  )

  useEffect(() => {
    if (active) {
      timeout.current.setupTimeout(refetch)
      return () => {
        useStatic.setState({ excludeList: [] })
        timeout.current.off()
      }
    }
  }, [active])

  if (error) {
    if (error.networkError?.statusCode === 464) {
      useStatic.setState({ clientError: 'old_client' })
      return null
    }
    if (error.networkError?.statusCode === 511) {
      useStatic.setState({ clientError: 'session_expired' })
      return null
    }
  }

  return {
    data: (data || previousData || { [category]: [] })[category],
    error,
    loading,
  }
}
