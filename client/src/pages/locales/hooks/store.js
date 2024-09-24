// @ts-check
import { create } from 'zustand'

import { downloadJson } from '@utils/downloadJson'

/**
 * @typedef {{
 *  custom: Record<string, string | number>
 *  existingHuman: Record<string, string | number>
 *  all: boolean
 *  instructions: boolean
 * }} LocalesStore
 * @type {import("zustand").UseBoundStore<import("zustand").StoreApi<LocalesStore>>}
 */
export const useLocalesStore = create(() => ({
  custom: {},
  existingHuman: {},
  all: false,
  instructions: false,
  isScrolling: false,
}))

export const downloadLocales = () => {
  const { custom, existingHuman } = useLocalesStore.getState()
  const locale = localStorage.getItem('i18nextLng') || 'en'
  const filtered = Object.fromEntries(
    Object.entries(custom).filter(([, v]) => v !== ''),
  )
  return downloadJson({ ...existingHuman, ...filtered }, `${locale}.json`)
}
