// @ts-check
import { useStorage } from '@store/useStorage'

const METERS_PER_MILE = 1609.344

export function formatDistance(
  meters = 0,
  unit = useStorage.getState().settings.distanceUnit,
  locale = localStorage.getItem('i18nextLng') || 'en',
) {
  const distance = unit === 'miles' ? meters / METERS_PER_MILE : meters / 1000

  const numFormatter = new Intl.NumberFormat(locale, {
    unitDisplay: 'short',
    unit: unit.replace(/s$/, ''),
    style: 'unit',
    maximumFractionDigits: 2,
  })

  return numFormatter.format(distance)
}
