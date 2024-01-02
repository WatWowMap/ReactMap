// @ts-check
import { useEffect } from 'react'
import { useQuery } from '@apollo/client'
import getAvailable from '@services/queries/available'

import { deepMerge } from '@services/functions/deepMerge'
import UAssets from '@services/Icons'

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
      const { masterfile, filters, icons, audio, ...rest } = data.available
      const { icons: userIcons, audio: userAudio } = useStore.getState()
      const existing = useStatic.getState()

      const Icons =
        existing.Icons ??
        new UAssets(icons, masterfile.questRewardTypes, 'uicons')
      const Audio =
        existing.Audio ??
        new UAssets(audio, masterfile.questRewardTypes, 'uaudio')
      Icons.build(
        typeof structuredClone === 'function'
          ? structuredClone(icons.styles)
          : JSON.parse(JSON.stringify(icons.styles)),
      )
      Audio.build(
        typeof structuredClone === 'function'
          ? structuredClone(audio.styles)
          : JSON.parse(JSON.stringify(audio.styles)),
      )
      if (icons.defaultIcons && !existing) {
        Icons.setSelection(icons.defaultIcons)
      }
      if (audio.defaultAudio && !existing) {
        Audio.setSelection(audio.defaultAudio)
      }
      if (Icons.checkValid(userIcons)) {
        Icons.setSelection(userIcons)
      }
      if (Audio.checkValid(userAudio)) {
        Audio.setSelection(userAudio)
      }
      useStore.setState({ icons: Icons.selection, audio: Audio.selection })
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
        Audio,
      })
      useStore.setState((prev) => ({
        filters: deepMerge({}, filters, prev.filters),
      }))
    }
  }, [data])
}
