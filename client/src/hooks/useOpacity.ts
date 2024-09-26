import { useCallback } from 'react'

import { useStorage } from '@store/useStorage'

export function useOpacity<
  T extends 'pokemon' | 'gyms' | 'pokestops' | 'stations',
>(
  category: T,
  subCategory?: T extends 'pokestops'
    ? 'invasion'
    : T extends 'gyms'
      ? 'raid'
      : never,
) {
  const enabled = useStorage(
    (s) =>
      s.userSettings[category]?.[`${subCategory || category}Opacity`] ?? false,
  )
  const opacityOneMinute = useStorage(
    (s) => s.userSettings[category]?.opacityOneMinute || 0.25,
  )
  const opacityFiveMinutes = useStorage(
    (s) => s.userSettings[category]?.opacityFiveMinutes || 0.5,
  )
  const opacityTenMinutes = useStorage(
    (s) => s.userSettings[category]?.opacityTenMinutes || 0.75,
  )

  const getOpacity: (time: number) => number = useCallback(
    (time) => {
      if (!enabled) return 1
      const now = Math.floor(Date.now() / 1000)
      const diff = time - now
      if (!diff || diff > 600) return 1
      if (diff > 300) return opacityTenMinutes
      if (diff > 60) return opacityFiveMinutes
      return opacityOneMinute
    },
    [enabled, opacityOneMinute, opacityFiveMinutes, opacityTenMinutes],
  )

  return getOpacity
}
