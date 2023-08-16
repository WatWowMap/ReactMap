import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * TODO: Finish this
 * @typedef {{
 *   darkMode: boolean,
 *   location: [number, number],
 *   popups: Record<string, boolean>,
 *   zoom: number,
 *   selectedWebhook: string,
 *   settings: { localeSelection: string, navigationControls: 'react' | 'leaflet' }
 *   motdIndex: number
 *   tutorial: boolean,
 *   searchTab: string,
 *   search: string,
 *   filters: object,
 *   scannerCooldown: number
 * }} UseStore
 * @type {import("zustand").UseBoundStore<import("zustand").StoreApi<UseStore>>}
 */
export const useStore = create(
  persist(
    (set, get) => ({
      darkMode: !!window?.matchMedia('(prefers-color-scheme: dark)').matches,
      location: undefined,
      setLocation: (location) => set({ location }),
      zoom: undefined,
      setZoom: (zoom) => set({ zoom }),
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
      setSettings: (settings) => set({ settings }),
      userSettings: undefined,
      setUserSettings: (userSettings) => set({ userSettings }),
      icons: undefined,
      setIcons: (icons) => set({ icons }),
      menus: undefined,
      setMenus: (menus) => set({ menus }),
      tutorial: true,
      setTutorial: (tutorial) => set({ tutorial }),
      sidebar: undefined,
      setSidebar: (sidebar) => set({ sidebar }),
      advMenu: {
        pokemon: 'others',
        gyms: 'categories',
        pokestops: 'categories',
        nests: 'others',
      },
      setAdvMenu: (advMenu) => set({ advMenu }),
      search: '',
      searchTab: '',
      selectedWebhook: undefined,
      setSelectedWebhook: (selectedWebhook) => set({ selectedWebhook }),
      webhookAdv: {
        primary: true,
        advanced: false,
        pvp: false,
        distance: true,
        global: true,
      },
      setWebhookAdv: (webhookAdv) => set({ webhookAdv }),
      popups: {
        invasions: false,
        extras: false,
        raids: true,
        pvp: false,
        names: true,
      },
      setPopups: (popups) => set({ popups }),
      motdIndex: 0,
      setMotdIndex: (motdIndex) => set({ motdIndex }),
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
 *   masterfile: { invasions: object }
 * }} UseStatic
 * @type {import("zustand").UseBoundStore<import("zustand").StoreApi<UseStatic>>}
 */
export const useStatic = create((set) => ({
  isMobile: false,
  isTablet: false,
  active: true,
  searchLoading: false,
  setActive: (active) => set({ active }),
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
  setAuth: (auth) => set({ auth }),
  config: undefined,
  setConfig: (config) => set({ config }),
  filters: {},
  setFilters: (filters) => set({ filters }),
  menus: undefined,
  setMenus: (menus) => set({ menus }),
  menuFilters: undefined,
  setMenuFilters: (menuFilters) => set({ menuFilters }),
  userSettings: undefined,
  setUserSettings: (userSettings) => set({ userSettings }),
  settings: undefined,
  setSettings: (settings) => set({ settings }),
  available: {
    gyms: [],
    pokemon: [],
    pokestops: [],
    nests: [],
    questConditions: {},
  },
  setAvailable: (available) => set({ available }),
  Icons: undefined,
  setIcons: (Icons) => set({ Icons }),
  ui: {},
  setUi: (ui) => set({ ui }),
  masterfile: {
    invasions: {},
    pokemon: {},
    questRewardTypes: {},
    types: {},
  },
  setMasterfile: (masterfile) => set({ masterfile }),
  hideList: [],
  setHideList: (hideList) => set({ hideList }),
  excludeList: [],
  setExcludeList: (excludeList) => set({ excludeList }),
  timerList: [],
  setTimerList: (timerList) => set({ timerList }),
  webhookAlert: {
    open: false,
    severity: 'info',
    message: '',
  },
  setWebhookAlert: (webhookAlert) => set({ webhookAlert }),
  timeOfDay: 'day',
  setTimeOfDay: (timeOfDay) => set({ timeOfDay }),
  extraUserFields: [],
  setExtraUserFields: (extraUserFields) => set({ extraUserFields }),
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
}))

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
