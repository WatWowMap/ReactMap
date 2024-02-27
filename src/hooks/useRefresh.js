// @ts-check
import { useEffect } from 'react'
import { useQuery } from '@apollo/client'
import { getMapData } from '@services/queries/available'

import { deepMerge } from '@services/functions/deepMerge'
import UAssets from '@services/Icons'

import { useMemory } from './useMemory'
import { useStorage } from './useStorage'

export default function useRefresh(once = false) {
  const active = useMemory((s) => s.active)
  const online = useMemory((s) => s.online)

  const hasIcons = useMemory((s) => !!s.Icons)

  const { data, loading, stopPolling, startPolling, refetch, error } = useQuery(
    getMapData,
    {
      fetchPolicy: active && online ? 'network-only' : 'cache-only',
    },
  )

  useEffect(() => {
    if (active && online && !once) {
      startPolling(1000 * 60 * 60)
      return () => stopPolling()
    }
  }, [active, online, once])

  useEffect(() => {
    if (!hasIcons && online) {
      refetch()
    }
  }, [hasIcons, online])

  useEffect(() => {
    if (error && 'statusCode' in error.networkError) {
      stopPolling()
      if (error.networkError?.statusCode === 464) {
        useMemory.setState({ clientError: 'early_old_client' })
      }
      if (error.networkError?.statusCode === 511) {
        useMemory.setState({ clientError: 'session_expired' })
      }
    }
  }, [error])

  useEffect(() => {
    if (data?.available) {
      const { masterfile, filters, icons, audio, questConditions } =
        data.available
      const { icons: userIcons, audio: userAudio } = useStorage.getState()
      const existing = useMemory.getState()

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
      useStorage.setState({ icons: Icons.selection, audio: Audio.selection })
      if (masterfile) {
        localStorage.setItem(
          'questRewardTypes',
          JSON.stringify(masterfile.questRewardTypes),
        )
      }
      useMemory.setState((prev) => ({
        masterfile,
        filters,
        Icons,
        Audio,
        available: {
          ...prev.available,
          questConditions,
        },
      }))
      useStorage.setState((prev) => ({
        filters: deepMerge({}, filters, prev.filters),
      }))
    }
  }, [data])

  return loading
}
