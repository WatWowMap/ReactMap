// @ts-check
import { useStorage } from '@hooks/useStorage'

const METERS_PER_MILE = 1609.344

/** @param {number} meters */
export function formatDistance(
  meters,
  unit = useStorage.getState().settings.distanceUnit,
  locale = localStorage.getItem('i18nextLng') || 'en',
) {
  const safe = meters || 0
  const distance = unit === 'miles' ? safe / METERS_PER_MILE : safe / 1000

  const numFormatter = new Intl.NumberFormat(locale, {
    unitDisplay: 'short',
    unit: unit.replace(/s$/, ''),
    style: 'unit',
    maximumFractionDigits: 2,
  })

  return numFormatter.format(distance)
}
