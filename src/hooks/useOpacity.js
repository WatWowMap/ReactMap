// @ts-check
import { useCallback } from 'react'
import { basicEqualFn, useStore } from './useStore'

/**
 * Returns dynamic opacity based on timestamp
 * @param {'pokemon' | 'gyms' | 'pokestops'} category
 * @param {'raids' | 'invasions'} [subCategory]
 * @returns
 */
export default function useOpacity(category, subCategory) {
  const [enabled, opacityOneMinute, opacityFiveMinutes, opacityTenMinutes] =
    useStore(
      (s) => [
        s.userSettings[category]?.[`${subCategory || category}Opacity`] ??
          false,
        s.userSettings[category]?.opacityOneMinute || 0.25,
        s.userSettings[category]?.opacityFiveMinutes || 0.5,
        s.userSettings[category]?.opacityTenMinutes || 0.75,
      ],
      basicEqualFn,
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
