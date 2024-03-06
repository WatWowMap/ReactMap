// @ts-check
import { useCallback } from 'react'
import { useStorage } from '@store/useStorage'

/**
 * Returns dynamic opacity based on timestamp
 * @template {'pokemon' | 'gyms' | 'pokestops'} T
 * @param {T} category
 * @param {T extends 'pokestops' ? 'invasion' : T extends 'gyms' ? 'raid' : never} [subCategory]
 * @returns
 */
export function useOpacity(category, subCategory) {
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

  /** @type {(time: number) => number} */
  const getOpacity = useCallback(
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
