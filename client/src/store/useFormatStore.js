// @ts-check

import { create } from 'zustand'

const UNITS = /** @type {const} */ ([
  { unit: 'year', value: 31536000 },
  { unit: 'month', value: 2592000 },
  { unit: 'week', value: 604800 },
  { unit: 'day', value: 86400 },
  { unit: 'hour', value: 3600 },
  { unit: 'minute', value: 60 },
  { unit: 'second', value: 1 },
])

/** @param {string} locale */
const getFormatters = (locale) => ({
  dateFormat: new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }),
  timeFormat: new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  }),
  relativeFormat: new Intl.RelativeTimeFormat(locale, {
    numeric: 'always',
    style: 'short',
  }),
  numberFormat: new Intl.NumberFormat(locale),
  collator: new Intl.Collator(locale, {
    sensitivity: 'base',
    ignorePunctuation: true,
  }),
  /** @param {string} unit */
  distanceFormat: (unit) =>
    new Intl.NumberFormat(locale, {
      unitDisplay: 'short',
      unit: unit.replace(/s$/, ''),
      style: 'unit',
      maximumFractionDigits: 2,
    }),
})

/**
 * @typedef {{
 *  locale: string
 *  dateFormat: Intl.DateTimeFormat
 *  timeFormat: Intl.DateTimeFormat
 *  relativeFormat: Intl.RelativeTimeFormat
 *  numberFormat: Intl.NumberFormat
 *  collator: Intl.Collator
 *  distanceFormat: (unit: string) => Intl.NumberFormat
 *  setLocale: (locale: string) => void
 *  getRelative: (epoch: number) => string
 * }} UseMapStore
 * @type {import("zustand").UseBoundStore<import("zustand").StoreApi<UseMapStore>>}
 */
export const useFormatStore = create((set, get) => ({
  locale: window.navigator.language,
  ...getFormatters(window.navigator.language),
  getRelative: (epoch) => {
    let seconds = Math.ceil((epoch * 1000 - Date.now()) / 1000)
    const rtf = get().relativeFormat
    const isNegative = seconds < 0
    seconds = Math.abs(seconds)
    const result = []

    for (let i = 0; i < UNITS.length; i++) {
      const { unit, value } = UNITS[i]
      const count = Math.floor(seconds / value)
      if (count > 0) {
        result.push(
          rtf.format(isNegative ? -count : count, unit).replace('.', ''),
        )
        seconds -= count * value
      }
    }

    if (isNegative && result.length) return result[0]

    return result
      .filter((_, i) => i < 2)
      .map((r, i) => {
        if (i === 0) return r
        const [first, ...rest] = r.split(' ')
        if (+first) return r
        return rest.join(' ')
      })
      .join(', ')
  },
  setLocale: (locale) => {
    set({ locale, ...getFormatters(locale) })
  },
}))
