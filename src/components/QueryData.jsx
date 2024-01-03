// @ts-check
import * as React from 'react'
import { useQuery } from '@apollo/client'
import { useMap } from 'react-leaflet'

import { useStatic, useStore } from '@hooks/useStore'
import { usePermCheck } from '@hooks/usePermCheck'
import Query from '@services/Query'
import { getQueryArgs } from '@services/functions/getQueryArgs'
import RobustTimeout from '@services/apollo/RobustTimeout'
import Utility from '@services/Utility'

import * as index from './tiles/index'
import Clustering from './Clustering'
import Notification from './layout/general/Notification'
import { GenerateCells } from './tiles/S2Cell'

const FILTER_SKIP_LIST = ['filter', 'enabled', 'legacy']

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
  const easyMode = !!requestedFilters?.easyMode
  const trimmed = {
    onlyLegacy: userSettings?.legacyFilter,
    onlyLinkGlobal: userSettings?.linkGlobalAndAdvanced || easyMode,
    onlyAllPvp: userSettings?.showAllPvpRanks,
    onlyAreas: onlyAreas || [],
  }
  Object.entries(requestedFilters).forEach((topLevelFilter) => {
    const [id, specifics] = topLevelFilter

    if (!FILTER_SKIP_LIST.includes(id)) {
      trimmed[`only${id.charAt(0).toUpperCase()}${id.slice(1)}`] = specifics
    }
  })
  Object.entries(userSettings || {}).forEach(([entryK, entryV]) => {
    if (entryK.startsWith('pvp')) {
      trimmed[`only${entryK.charAt(0).toUpperCase()}${entryK.slice(1)}`] =
        entryV
    }
  })
  Object.entries(requestedFilters.filter).forEach((filter) => {
    const [id, specifics] = filter

    if (specifics && specifics.enabled && staticFilters[category]?.filter[id]) {
      trimmed[id] = easyMode ? requestedFilters.ivOr : specifics
    }
  })
  return trimmed
}

export default function FilterPermCheck({ category }) {
  const valid = usePermCheck(category)
  const error = useStatic((state) => state.clientError)

  if (!valid || error) {
    return null
  }
  return category === 's2cells' ? (
    <GenerateCells />
  ) : (
    <QueryWrapper category={category} />
  )
}

function QueryWrapper({ category }) {
  const timeout = React.useRef(new RobustTimeout(category))
  Utility.analytics('Data', `${category} being fetched`, category, true)

  return <QueryData category={category} timeout={timeout} />
}

function QueryData({ category, timeout }) {
  const Component = React.useMemo(() => index[category], [])

  const map = useMap()

  const hideList = useStatic((s) => s.hideList)
  const active = useStatic((s) => s.active)

  const userSettings = useStore(
    (s) => s.userSettings[userSettingsCategory(category)],
  )
  const filters = useStore((s) => s.filters[category])
  const onlyAreas = useStore(
    (s) =>
      s.filters?.scanAreas?.filterByAreas &&
      s.filters?.scanAreas?.filter?.areas,
  )

  const initial = React.useMemo(
    () => ({
      ...getQueryArgs(),
      filters: trimFilters(filters, userSettings, category, onlyAreas),
    }),
    [],
  )
  const { data, previousData, error, refetch } = useQuery(
    Query[category](filters),
    {
      context: {
        abortableContext: timeout.current,
      },
      variables: initial,
      fetchPolicy: active
        ? category === 'weather'
          ? 'cache-and-network'
          : 'no-cache'
        : 'cache-only',
      skip: !active,
    },
  )

  React.useEffect(() => {
    if (active) {
      timeout.current.setupTimeout(refetch)
      return () => {
        useStatic.setState({ excludeList: [] })
        timeout.current.off()
      }
    }
  }, [active, refetch, timeout])

  React.useEffect(() => {
    const refetchData = () => {
      if (category !== 'scanAreas') {
        timeout.current.doRefetch({
          ...getQueryArgs(),
          filters: trimFilters(filters, userSettings, category, onlyAreas),
        })
      }
    }
    map.on('fetchdata', refetchData)
    refetchData()
    return () => {
      map.off('fetchdata', refetchData)
    }
  }, [filters, userSettings, onlyAreas])

  if (error) {
    // @ts-ignore
    if (error.networkError?.statusCode === 464) {
      useStatic.setState({ clientError: 'old_client' })
      return null
    }
    // @ts-ignore
    if (error.networkError?.statusCode === 511) {
      useStatic.setState({ clientError: 'session_expired' })
      return null
    }
  }

  const returnData = (data || previousData || { [category]: [] })[category]

  if (!returnData) {
    return error && process.env.NODE_ENV === 'development' ? (
      <Notification
        open
        severity="error"
        i18nKey="server_dev_error_0"
        messages={[
          {
            key: 'error',
            variables: [error?.message],
          },
        ]}
      />
    ) : null
  }

  return (
    <Clustering category={category}>
      {returnData.map((each) => {
        if (!hideList.has(each.id)) {
          return <Component key={each.id || category} {...each} />
        }
        return null
      })}
    </Clustering>
  )
}
