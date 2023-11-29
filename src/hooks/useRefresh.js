// @ts-check
import { useEffect } from 'react'
import { useQuery } from '@apollo/client'
import getAvailable from '@services/queries/available'

import { deepMerge } from '@services/functions/deepMerge'
import UIcons from '@services/Icons'

import { useStatic, useStore } from './useStore'

export default function useRefresh() {
  const active = useStatic((s) => s.active)
  const online = useStatic((s) => s.online)

  const hasIcons = useStatic((s) => !!s.Icons)

  const { data, stopPolling, startPolling, refetch } = useQuery(getAvailable, {
    fetchPolicy: active && online ? 'network-only' : 'cache-only',
  })

  useEffect(() => {
    if (active && online) {
      startPolling(1000 * 60 * 60)
      return () => stopPolling()
    }
  }, [active, online])

  useEffect(() => {
    if (!hasIcons && online) {
      refetch()
    }
  }, [hasIcons, online])

  useEffect(() => {
    if (data?.available) {
      const { masterfile, filters, icons, ...rest } = data.available
      const { icons: userIcons } = useStore.getState()
      const existing = useStatic.getState().Icons
      const Icons = existing ?? new UIcons(icons, masterfile.questRewardTypes)

      Icons.build(structuredClone(icons.styles))
      if (icons.defaultIcons && !existing) {
        Icons.setSelection(icons.defaultIcons)
      }
      if (Icons.checkValid(userIcons)) {
        Icons.setSelection(userIcons)
      }
      useStore.setState({ icons: Icons.selection })
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
