// @ts-check
import { useEffect } from 'react'
import { useQuery } from '@apollo/client'

import { GET_MAP_DATA } from '@services/queries/available'
import { deepMerge } from '@utils/deepMerge'
import { UAssets } from '@services/Assets'
import { useMemory } from '@store/useMemory'
import { useStorage } from '@store/useStorage'
import { useProcessError } from '@hooks/useProcessError'

export function useMapData(once = false) {
  const active = useMemory((s) => s.active)
  const online = useMemory((s) => s.online)

  const hasIcons = useMemory((s) => !!s.Icons)

  const { data, loading, stopPolling, startPolling, refetch, error } = useQuery(
    GET_MAP_DATA,
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

  useProcessError(error)

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
      if (icons.overrides) {
        Icons.setSelection(icons.overrides)
      }
      if (audio.overrides) {
        Audio.setSelection(audio.overrides)
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
      useStorage.setState((prev) => {
        const newFilters = deepMerge({}, filters, prev.filters)

        // Migration for quest conditions to use target as well
        Object.entries(newFilters?.pokestops?.filter || {}).forEach(
          ([key, filter]) => {
            if (filter.adv && questConditions[key]) {
              const newAdv = filter.adv
                .split(',')
                .flatMap((each) =>
                  questConditions[key]
                    .filter(({ title }) => title === each)
                    .map(({ target }) => `${each}__${target}`),
                )
              if (newAdv.length) {
                filter.adv = newAdv.join(',')
              }
            }
          },
        )
        return {
          filters: newFilters,
        }
      })
    }
  }, [data])

  return loading
}
