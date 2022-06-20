import { useQuery } from '@apollo/client'
import getAvailable from '@services/queries/available'
import { useEffect } from 'react'

import { useStatic } from './useStore'

export default function useRefresh() {
  const setAvailable = useStatic((s) => s.setAvailable)
  const setMasterfile = useStatic((s) => s.setMasterfile)
  const setStaticFilters = useStatic((s) => s.setFilters)
  const active = useStatic((s) => s.active)

  const { data, stopPolling, startPolling } = useQuery(getAvailable, {
    variables: { version: inject.VERSION },
    fetchPolicy: active ? 'network-only' : 'cache-only',
    pollInterval: 1000 * 60 * 60,
  })

  useEffect(() => {
    if (active) {
      startPolling()
    } else {
      stopPolling()
    }
  }, [active])

  useEffect(() => {
    if (data?.available) {
      const { masterfile, filters, ...rest } = data.available
      setAvailable(rest)
      setMasterfile(masterfile)
      setStaticFilters(filters)
    }
  }, [data])
}
