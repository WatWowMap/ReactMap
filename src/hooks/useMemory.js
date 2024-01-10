import Utility from '@services/Utility'
import { create } from 'zustand'
import { useStorage } from './useStorage'

/**
 * TODO: Finish this
 * @typedef {{
 *   isMobile: boolean,
 *   isTablet: boolean,
 *   active: boolean,
 *   online: boolean,
 *   searchLoading: boolean,
 *   Icons: InstanceType<typeof import("../services/Icons").default>,
 *   Audio: InstanceType<typeof import("../services/Icons").default>,
 *   config: import('@rm/types').Config['map'],
 *   ui: import('@rm/types').UIObject,
 *   auth: {
 *    perms: Partial<import('@rm/types').Permissions>,
 *    loggedIn: boolean,
 *    methods: string[],
 *    strategy: import('@rm/types').Strategy | '',
 *    userBackupLimits: number,
 *    excludeList: string[],
 *    discordId: string,
 *    telegramId: string,
 *    webhookStrategy: string,
 *    username: string,
 *    data: Record<string, any>,
 *    counts: {
 *      areaRestrictions: number,
 *      webhooks: number,
 *      scanner: number,
 *    },
 *   },
 *   filters: import('@rm/types').AllFilters,
 *   masterfile: import('@rm/types').Masterfile
 *   polling: Record<string, number>
 *   gymValidDataLimit: number
 *   settings: Record<string, any>
 *   userSettings: Record<string, any>
 *   clientError: string,
 *   map: import('leaflet').Map | null,
 *   timeOfDay: import('@rm/types').TimesOfDay,
 *   hideList: Set<string | number>,
 *   excludeList: string[],
 *   timerList: string[],
 *   tileStyle: 'light' | 'dark',
 *   reset: boolean,
 *   theme: {
 *     primary: string,
 *     secondary: string,
 *   },
 *   available: {
 *     gyms: string[],
 *     pokemon: string[],
 *     pokestops: string[],
 *     nests: string[],
 *     questConditions: Record<string, { title: string, target?: number }[]>,
 *   }
 *   manualParams: {
 *     category: string,
 *     id: number | string,
 *   },
 *   extraUserFields: (import('@rm/types').ExtraField | string)[],
 * }} UseMemory
 *
 * @type {import("zustand").UseBoundStore<import("zustand").StoreApi<UseMemory>>}
 */
export const useMemory = create((set) => ({
  isMobile: false,
  isTablet: false,
  active: true,
  online: true,
  searchLoading: false,
  reset: false,
  tileStyle: 'light',
  clientError: '',
  map: null,
  theme: {
    primary: '#ff5722',
    secondary: '#00b0ff',
  },
  polling: {},
  gymValidDataLimit: 0,
  auth: {
    strategy: '',
    discordId: '',
    telegramId: '',
    webhookStrategy: '',
    loggedIn: false,
    perms: {},
    methods: [],
    username: '',
    data: {},
    counts: {
      areaRestrictions: 0,
      webhooks: 0,
      scanner: 0,
    },
    userBackupLimits: 0,
  },
  config: {},
  filters: {},
  menus: undefined,
  menuFilters: {},
  userSettings: undefined,
  settings: undefined,
  available: {
    gyms: [],
    pokemon: [],
    pokestops: [],
    nests: [],
    questConditions: {},
  },
  Icons: null,
  Audio: null,
  ui: {},
  masterfile: {
    invasions: {},
    pokemon: {},
    questRewardTypes: {},
    types: {},
  },
  hideList: new Set(),
  excludeList: [],
  timerList: [],
  webhookAlert: {
    open: false,
    severity: 'info',
    message: '',
  },
  setWebhookAlert: (webhookAlert) => set({ webhookAlert }),
  timeOfDay: 'day',
  extraUserFields: [],
  manualParams: {
    category: '',
    id: '',
  },
}))

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
 *    category: import('@rm/types').AdvCategories,
 *    id: string,
 *    selectedIds: string[],
 *  },
 *  dialog: {
 *    open: boolean,
 *    category: string,
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
    category: 'pokemon',
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

/**
 * @template {string | number | boolean} T
 * @param {T[]} p
 * @param {T[]} n
 * @returns {boolean}
 */
export const basicEqualFn = (p, n) =>
  p.length === n.length && p.every((v, i) => v === n[i])
