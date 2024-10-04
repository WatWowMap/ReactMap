import { useTranslation } from 'react-i18next'
import { formatDistance } from '@utils/formatDistance'
import { useStorage } from '@store/useStorage'

export function useFormatDistance(): (meters: number) => string {
  const { i18n } = useTranslation()
  const unit = useStorage((s) => s.settings.distanceUnit)

  return (meters) => formatDistance(meters, unit, i18n.language)
}
