import { create } from 'zustand'
import { analytics } from '@utils/analytics'

import { useStorage } from './useStorage'

export interface UseLayoutStore {
  nestSubmissions: {
    id: string | number
    name: string
  }
  help: {
    open: boolean
    category: string
  }
  motd: boolean
  donorPage: boolean
  search: boolean
  pkmnFilterHelp: boolean
  userProfile: boolean
  resetFilters: boolean
  feedback: boolean
  drawer: boolean
  advancedFilter: {
    open: boolean
    category: import('@rm/types').AdvCategories | ''
    id: string
    selectedIds: string[]
  }
  dialog: {
    open: boolean
    category: keyof import('@rm/types').UIObject | 'notifications' | ''
    type: 'options' | 'filters' | ''
  }
  gymBadge: {
    open: boolean
    gymId: string
    badge: number
  }
  slotSelection: string
}

export const useLayoutStore = create<UseLayoutStore>(() => ({
  nestSubmissions: {
    id: '',
    name: '',
  },
  help: { open: false, category: '' },
  motd: false,
  pkmnFilterHelp: false,
  donorPage: false,
  search: false,
  userProfile: false,
  resetFilters: false,
  feedback: false,
  drawer: false,
  slotSelection: '',
  advancedFilter: {
    open: false,
    category: '',
    id: '',
    selectedIds: [],
  },
  dialog: {
    open: false,
    category: '',
    type: '',
  },
  gymBadge: {
    open: false,
    gymId: '',
    badge: 0,
  },
}))

export const toggleDialog =
  (
    open: boolean,
    category?: UseLayoutStore['dialog']['category'],
    type?: UseLayoutStore['dialog']['type'],
    filter?: import('@rm/types').BaseFilter | import('@rm/types').PokemonFilter,
  ): (() => void) =>
  () => {
    analytics(
      'Menu Toggle',
      `Open: ${open}`,
      `Category: ${category} Menu: ${type}`,
    )
    useLayoutStore.setState((prev) => ({
      dialog: {
        open,
        category: category || prev.dialog.category,
        type: type || prev.dialog.type,
      },
    }))
    if (filter && type === 'filters') {
      useStorage.setState((prev) => ({
        filters: {
          ...prev.filters,
          [category]: { ...prev.filters[category], filter },
        },
      }))
    }
    if (filter && type === 'options') {
      useStorage.setState((prev) => ({
        userSettings: {
          ...prev.userSettings,
          [category]: filter,
        },
      }))
    }
  }
