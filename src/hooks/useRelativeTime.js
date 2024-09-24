// @ts-check

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useFormatStore } from '@store/useFormatStore'

/**
 *
 * @param {number} epochTime
 * @returns
 */
export function useRelativeTimer(epochTime) {
  const { t } = useTranslation()
  const relativeFormat = useFormatStore((s) => s.getRelative)
  const [relative, setRelative] = useState(relativeFormat(epochTime))

  useEffect(() => {
    const interval = setInterval(() => {
      setRelative(relativeFormat(epochTime))
    }, 1000)
    return () => clearInterval(interval)
  }, [relativeFormat])

  useEffect(() => {
    setRelative(relativeFormat(epochTime))
  }, [epochTime, relativeFormat])

  return epochTime ? relative : t('never')
}
