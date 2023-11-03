import Utility from '@services/Utility'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

/**
 * TODO: Finish this
 * @typedef {{
 *   darkMode: boolean,
 *   location: [number, number],
 *   popups: Record<string, boolean>,
 *   zoom: number,
 *   sidebar: string,
 *   selectedWebhook: string,
 *   settings: {
 *    navigationControls: 'react' | 'leaflet'
 *    navigation: string,
 *    tileServers: string
 *   },
 *   menus: Record<string, boolean>,
 *   holidayEffects: Record<string, boolean>,
 *   motdIndex: number
 *   tutorial: boolean,
 *   searchTab: string,
 *   search: string,
 *   filters: object,
 *   scannerCooldown: number
 *   icons: Record<string, string>
 *   userSettings: Record<string, any>
 *   profiling: boolean
 *   setAreas: (areas: string | string[], validAreas: string[], unselectAll?: boolean) => void,
 * }} UseStore
 * @type {import("zustand").UseBoundStore<import("zustand").StoreApi<UseStore>>}
 */
export const useStore = create(
  persist(
    (set, get) => ({
      darkMode: !!window?.matchMedia('(prefers-color-scheme: dark)').matches,
      location: [
        CONFIG.map.general.startLat || 0,
        CONFIG.map.general.startLon || 0,
      ],
      zoom: CONFIG.map.general.startZoom,
      filters: {},
      setFilters: (filters) => set({ filters }),
      setAreas: (areas = [], validAreas = [], unselectAll = false) => {
        const { filters } = get()
        const incoming = new Set(Array.isArray(areas) ? areas : [areas])
        const existing = new Set(filters?.scanAreas?.filter?.areas || [])

        incoming.forEach((area) => {
          if (existing.has(area) || unselectAll) {
            existing.delete(area)
          } else {
            existing.add(area)
          }
        })
        if (filters?.scanAreas?.filter?.areas) {
          set({
            filters: {
              ...filters,
              scanAreas: {
                ...filters.scanAreas,
                filter: {
                  ...filters.scanAreas.filter,
                  areas: [...existing].filter((area) =>
                    validAreas.includes(area),
                  ),
                },
              },
            },
          })
        }
      },
      holidayEffects: {},
      settings: {},
      userSettings: {},
      icons: {},
      menus: {},
      tutorial: true,
      sidebar: '',
      advMenu: {
        pokemon: 'others',
        gyms: 'categories',
        pokestops: 'categories',
        nests: 'others',
      },
      search: '',
      searchTab: '',
      webhookAdv: {
        primary: true,
        advanced: false,
        pvp: false,
        distance: true,
        global: true,
      },
      popups: {
        invasions: false,
        extras: false,
        raids: true,
        pvp: false,
        names: true,
      },
      motdIndex: 0,
      scannerCooldown: 0,
      profiling: false,
    }),
    {
      name: 'local-state',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)

/**
 * TODO: Finish this
 * @typedef {{
 *   isMobile: boolean,
 *   isTablet: boolean,
 *   active: boolean,
 *   online: boolean,
 *   searchLoading: boolean,
 *   Icons: InstanceType<typeof import("../services/Icons").default>,
 *   config: import('@rm/types').Config['map'],
 *   ui: object
 *   auth: { perms: Partial<import('@rm/types').Permissions>, loggedIn: boolean, methods: string[], strategy: import('@rm/types').Strategy | '' },
 *   filters: object,
 *   masterfile: import('@rm/types').Masterfile
 *   polling: Record<string, number>
 *   gymValidDataLimit: number
 *   settings: Record<string, any>
 *   userSettings: Record<string, any>
 *   clientError: string,
 *   map: import('leaflet').Map | null,
 *   timeOfDay: 'day' | 'night' | 'dusk' | 'dawn',
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
 *   }
 *   manualParams: {
 *     category: string,
 *     id: number | string,
 *  },
 * }} UseStatic
 * @type {import("zustand").UseBoundStore<import("zustand").StoreApi<UseStatic>>}
 */
export const useStatic = create((set) => ({
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
  Icons: undefined,
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

// /**
//  * @typedef {{
//  *  nestSubmissions: string | number,
//  *  motd: boolean,
//  *  donorPage: boolean,
//  *  search: boolean,
//  *  userProfile: boolean,
//  * }} UseDialog
//  * @type {import("zustand").UseBoundStore<import("zustand").StoreApi<UseDialog>>}
//  */
export const useLayoutStore = create(() => ({
  nestSubmissions: '0',
  motd: false,
  donorPage: false,
  search: false,
  userProfile: false,
  resetFilters: false,
  feedback: false,
  drawer: false,
  dialog: {
    open: false,
    category: '',
    type: '',
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
    useStore.setState((prev) => ({
      filters: {
        ...prev.filters,
        [category]: { ...prev.filters[category], filter },
      },
    }))
  }
  if (filter && type === 'options') {
    useStore.setState((prev) => ({
      userSettings: {
        ...prev.userSettings,
        [category]: filter,
      },
    }))
  }
}

/**
 * @typedef {'scanNext' | 'scanZone'} ScanMode
 * @typedef {'' | 'mad' | 'rdm' | 'custom'} ScannerType
 * @typedef {{
 *   scannerType: ScannerType,
 *   showScanCount: boolean,
 *   showScanQueue: boolean,
 *   advancedOptions: boolean,
 *   pokemonRadius: number,
 *   gymRadius: number,
 *   spacing: number,
 *   maxSize: number,
 *   cooldown: number,
 *   refreshQueue: number
 *   enabled: boolean,
 * }} ScanConfig
 * @typedef {{
 *  scanNextMode: '' | 'setLocation' | 'sendCoords' | 'loading' | 'confirmed' | 'error',
 *  scanZoneMode: UseScanStore['scanNextMode']
 *  queue: 'init' | '...' | number,
 *  scanLocation: [number, number],
 *  scanCoords: [number, number][],
 *  validCoords: boolean[],
 *  scanNextSize: 'S' | 'M' | 'L' | 'XL',
 *  scanZoneSize: number,
 *  userRadius: number,
 *  userSpacing: number,
 *  valid: 'none' | 'some' | 'all',
 *  estimatedDelay: number,
 *  setScanMode: <T extends `${ScanMode}Mode`>(mode: T, nextMode?: UseScanStore[T]) => void,
 *  setScanSize: <T extends `${ScanMode}Size`>(mode: T, size: UseScanStore[T]) => void,
 * }} UseScanStore
 * @type {import("zustand").UseBoundStore<import("zustand").StoreApi<UseScanStore>>}
 */
export const useScanStore = create((set) => ({
  scanNextMode: '',
  scanZoneMode: '',
  queue: 'init',
  scanLocation: [0, 0],
  scanCoords: [],
  validCoords: [],
  scanNextSize: 'S',
  scanZoneSize: 1,
  userRadius: 70,
  userSpacing: 1,
  valid: 'none',
  estimatedDelay: 0,
  setScanMode: (mode, nextMode = '') => set({ [mode]: nextMode }),
  setScanSize: (mode, size) => set({ [mode]: size }),
}))

/**
 * @template {string | number | boolean} T
 * @param {T[]} p
 * @param {T[]} n
 * @returns {boolean}
 */
export const basicEqualFn = (p, n) => p.every((v, i) => v === n[i])
