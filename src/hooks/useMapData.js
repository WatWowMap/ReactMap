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
      const {
        masterfile,
        filters,
        icons,
        audio,
        questConditions,
        supportsShinyStats,
      } = data.available
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
      if (icons.defaultIcons && !existing.Icons) {
        Icons.setSelection(icons.defaultIcons)
      }
      if (audio.defaultAudio && !existing.Audio) {
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
        featureFlags: {
          ...prev.featureFlags,
          supportsShinyStats:
            typeof supportsShinyStats === 'boolean'
              ? supportsShinyStats
              : prev.featureFlags.supportsShinyStats,
        },
      }))
      useStorage.setState((prev) => {
        const newFilters = deepMerge({}, filters, prev.filters)

        const currentPokestopFilters = filters.pokestops?.filter || {}
        const previousPokestopFilters = prev.filters.pokestops?.filter || {}
        const rocketKey = /^a(\d+)(?:-\d+)?$/
        const legacyUnknownRocketKey = /^a(\d+)-(?:undefined|null|NaN)$/
        const getRocketSpecies = (key) =>
          key.match(rocketKey)?.[1] || key.match(legacyUnknownRocketKey)?.[1]
        const currentRocketKeys = Object.keys(currentPokestopFilters).filter(
          (key) => rocketKey.test(key),
        )
        const previousRocketKeys = Object.keys(previousPokestopFilters).filter(
          (key) => getRocketSpecies(key),
        )

        // Availability can switch between a species-wide unknown key and one
        // or more scanner-observed exact forms. Carry user settings to new
        // replacement keys before pruning definitions the server no longer has.
        const rocketSpecies = new Set(
          [...currentRocketKeys, ...previousRocketKeys].map((key) =>
            getRocketSpecies(key),
          ),
        )
        rocketSpecies.forEach((pokemonId) => {
          const belongsToSpecies = (key) => getRocketSpecies(key) === pokemonId
          const currentKeys = currentRocketKeys.filter(belongsToSpecies)
          const previousKeys = previousRocketKeys.filter(belongsToSpecies)
          const previousUnknownKey = previousKeys.find(
            (key) =>
              key === `a${pokemonId}` || legacyUnknownRocketKey.test(key),
          )
          const hasUnknownKey =
            currentKeys.includes(`a${pokemonId}`) || previousUnknownKey
          const addedKeys = currentKeys.filter(
            (key) =>
              !Object.prototype.hasOwnProperty.call(
                previousPokestopFilters,
                key,
              ),
          )
          const removedKeys = previousKeys.filter(
            (key) =>
              !Object.prototype.hasOwnProperty.call(
                currentPokestopFilters,
                key,
              ),
          )
          if (!addedKeys.length || !removedKeys.length || !hasUnknownKey) return

          const removedSettings = removedKeys
            .map((key) => previousPokestopFilters[key])
            .filter(Boolean)
          if (!removedSettings.length) return

          // A bare setting maps directly to every newly observed form. When
          // several exact forms collapse to one unknown key, preserve the first
          // enabled form's settings and keep the union enabled if any was enabled.
          const replacement = previousPokestopFilters[previousUnknownKey] || {
            ...(removedSettings.find((setting) => setting.enabled) ||
              removedSettings[0]),
            enabled: removedSettings.some((setting) => setting.enabled),
          }
          addedKeys.forEach((key) => {
            newFilters.pokestops.filter[key] = {
              ...newFilters.pokestops.filter[key],
              ...replacement,
            }
          })
        })

        // Server filter definitions remain authoritative after settings move.
        Object.keys(newFilters.pokestops?.filter || {})
          .filter((key) => key.startsWith('a'))
          .forEach((key) => {
            if (
              !Object.prototype.hasOwnProperty.call(currentPokestopFilters, key)
            ) {
              delete newFilters.pokestops.filter[key]
            }
          })

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
        const defaultEnabled = prev.filters?.pokemon?.filter?.global?.enabled
        const serverEnabled = filters.pokemon?.filter?.global?.enabled
        if (
          defaultEnabled !== undefined &&
          serverEnabled !== undefined &&
          defaultEnabled !== serverEnabled
        )
          Object.entries(newFilters.pokemon.filter).forEach(([key, filter]) => {
            if (prev.filters.pokemon.filter[key] === undefined)
              filter.enabled = defaultEnabled
          })
        return {
          filters: newFilters,
        }
      })
    }
  }, [data])

  return loading
}
