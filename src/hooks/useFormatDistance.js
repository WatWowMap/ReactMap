// @ts-check
import { useTranslation } from 'react-i18next'

import { formatDistance } from '@utils/formatDistance'

import { useStorage } from './useStorage'

/** @returns {(meters: number) => string} */
export function useFormatDistance() {
  const { i18n } = useTranslation()
  const unit = useStorage((s) => s.settings.distanceUnit)

  return (meters) => formatDistance(meters, unit, i18n.language)
}
