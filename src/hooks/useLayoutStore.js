import { create } from 'zustand'

import Utility from '@services/Utility'
import { useStorage } from './useStorage'

/**
 * @typedef {{
 *  nestSubmissions: string | number,
 *  help: {
 *   open: boolean,
 *   category: string,
 *  },
 *  motd: boolean,
 *  donorPage: boolean,
 *  search: boolean,
 *  userProfile: boolean,
 *  resetFilters: boolean,
 *  feedback: boolean,
 *  drawer: boolean,
 *  advancedFilter: {
 *    open: boolean,
 *    category: import('@rm/types').AdvCategories | '',
 *    id: string,
 *    selectedIds: string[],
 *  },
 *  dialog: {
 *    open: boolean,
 *    category: import('@rm/types').AdvCategories | '',
 *    type: string,
 *  },
 *  gymBadge: {
 *   open: boolean,
 *   gymId: string,
 *   badge: number,
 *  },
 *  slotSelection: string,
 * }} UseLayoutStore
 *
 * @type {import("zustand").UseBoundStore<import("zustand").StoreApi<UseLayoutStore>>}
 */
export const useLayoutStore = create(() => ({
  nestSubmissions: '0',
  help: { open: false, category: '' },
  motd: false,
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

export const toggleDialog = (open, category, type, filter) => (event) => {
  Utility.analytics(
    'Menu Toggle',
    `Open: ${open}`,
    `Category: ${category} Menu: ${type}`,
  )
  if (
    event.type === 'keydown' &&
    (event.key === 'Tab' || event.key === 'Shift')
  ) {
    return
  }
  useLayoutStore.setState({ dialog: { open, category, type } })
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
