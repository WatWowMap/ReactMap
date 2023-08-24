import Utility from '@services/Utility'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
 *    localeSelection: keyof typeof import('@assets/mui/theme').LOCALE_MAP,
 *    navigationControls: 'react' | 'leaflet' }
 *   motdIndex: number
 *   tutorial: boolean,
 *   searchTab: string,
 *   search: string,
 *   filters: object,
 *   scannerCooldown: number
 *   icons: Record<string, string>
 *   userSettings: Record<string, any>
 * }} UseStore
 * @type {import("zustand").UseBoundStore<import("zustand").StoreApi<UseStore>>}
 */
export const useStore = create(
  persist(
    (set, get) => ({
      darkMode: !!window?.matchMedia('(prefers-color-scheme: dark)').matches,
      location: undefined,
      zoom: undefined,
      filters: undefined,
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
      settings: {},
      userSettings: undefined,
      icons: {},
      menus: undefined,
      tutorial: true,
      sidebar: undefined,
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
    }),
    {
      name: 'local-state',
      getStorage: () => localStorage,
    },
  ),
)

/**
 * TODO: Finish this
 * @typedef {{
 *   isMobile: boolean,
 *   isTablet: boolean,
 *   active: boolean,
 *   searchLoading: boolean,
 *   Icons: InstanceType<typeof import("../services/Icons").default>,
 *   config: object,
 *   auth: object,
 *   filters: object,
 *   masterfile: import('@rm/types').Masterfile
 *   settings: Record<string, any>
 *   userSettings: Record<string, any>
 *   clientError: string,
 *   map: import('leaflet').Map | null,
 *   timeOfDay: 'day' | 'night' | 'dusk' | 'dawn',
 *   hideList: string[],
 *   excludeList: string[],
 *   timerList: string[],
 * }} UseStatic
 * @type {import("zustand").UseBoundStore<import("zustand").StoreApi<UseStatic>>}
 */
export const useStatic = create((set) => ({
  isMobile: false,
  isTablet: false,
  active: true,
  searchLoading: false,
  clientError: '',
  map: null,
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
  config: undefined,
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
  hideList: [],
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
  manualParams: { id: '' },
}))

// /**
//  * @typedef {{
//  *  nestSubmissions: string,
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
 *
 * @param {(string | number | boolean)[]} p
 * @param {(string | number | boolean)[]} n
 * @returns
 */
export const basicEqualFn = (p, n) => p.every((v, i) => v === n[i])
