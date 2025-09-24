// @ts-check

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useFormatStore } from '@store/useFormatStore'

/**
 * Hook that returns a periodically updating relative time string for a unix epoch (seconds).
 * The interval depends on epochTime so its closure always reflects the current timestamp.
 *
 * @param {number} epochTime
 * @returns {string}
 */
export function useRelativeTimer(epochTime) {
  const { t } = useTranslation()
  const relativeFormat = useFormatStore((s) => s.getRelative)
  const [relative, setRelative] = useState(relativeFormat(epochTime))

  // Single effect: set immediately on mount/change, then tick every second.
  useEffect(() => {
    // Immediate update for new epochTime before first interval tick
    setRelative(relativeFormat(epochTime))
    const interval = setInterval(() => {
      setRelative(relativeFormat(epochTime))
    }, 1000)
    return () => clearInterval(interval)
  }, [epochTime, relativeFormat])

  return epochTime ? relative : t('never')
}
