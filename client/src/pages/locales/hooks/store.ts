// @ts-check
import { create } from 'zustand'
import { downloadJson } from '@utils/downloadJson'

export type LocalesStore = {
  custom: Record<string, string | number>
  existingHuman: Record<string, string | number>
  all: boolean
  instructions: boolean
}

export const useLocalesStore = create<LocalesStore>(() => ({
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
