// @ts-check
import { useEffect } from 'react'
import { useQuery } from '@apollo/client'
import getAvailable from '@services/queries/available'

import UIcons from '@services/Icons'
import { deepMerge } from '@services/functions/deepMerge'

import { useStatic, useStore } from './useStore'

export default function useRefresh() {
  const active = useStatic((s) => s.active)
  const online = useStatic((s) => s.online)

  const { data, stopPolling, startPolling } = useQuery(getAvailable, {
    fetchPolicy: active || !online ? 'network-only' : 'cache-only',
    pollInterval: 1000 * 60 * 60,
  })

  useEffect(() => {
    if (active && online) {
      startPolling(1000 * 60 * 60)
      return () => stopPolling()
    }
    stopPolling()
  }, [active, online])

  useEffect(() => {
    if (data?.available) {
      const { masterfile, filters, icons, ...rest } = data.available
      const { icons: userIcons } = useStore.getState()
      const Icons = new UIcons(icons, masterfile.questRewardTypes)
      if (Icons) {
        Icons.build(icons.styles)
        if (icons.defaultIcons) {
          Icons.setSelection(icons.defaultIcons)
        }
        if (Icons.checkValid(userIcons)) {
          Icons.setSelection(userIcons)
        }
        useStore.setState({ icons: Icons.selection })
      }
      if (masterfile) {
        localStorage.setItem(
          'questRewardTypes',
          JSON.stringify(masterfile.questRewardTypes),
        )
      }
      useStatic.setState({
        available: rest,
        masterfile,
        filters,
        Icons,
      })
      useStore.setState((prev) => ({
        filters: deepMerge({}, filters, prev.filters),
      }))
    }
  }, [data])
}
