import create from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * TODO: Finish this
 * @typedef {{
 *   darkMode: boolean,
 *   location: [number, number],
 *   popups: Record<string, boolean>,
 *   zoom: number,
 *   selectedWebhook: string,
 *   settings: Record<string, unknown>,
 *   motdIndex: number
 *   tutorial: boolean,
 *   searchTab: string,
 *   search: string,
 *   filters: object,
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
  filters: undefined,
  setFilters: (filters) => set({ filters }),
  menus: undefined,
  setMenus: (menus) => set({ menus }),
  menuFilters: undefined,
  setMenuFilters: (menuFilters) => set({ menuFilters }),
  userSettings: undefined,
  setUserSettings: (userSettings) => set({ userSettings }),
  settings: undefined,
  setSettings: (settings) => set({ settings }),
  available: undefined,
  setAvailable: (available) => set({ available }),
  Icons: undefined,
  setIcons: (Icons) => set({ Icons }),
  ui: {},
  setUi: (ui) => set({ ui }),
  masterfile: {},
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
  webhookData: undefined,
  setWebhookData: (webhookData) => set({ webhookData }),
  timeOfDay: 'day',
  setTimeOfDay: (timeOfDay) => set({ timeOfDay }),
  feedback: false,
  setFeedback: (feedback) => set({ feedback }),
  resetFilters: false,
  setResetFilters: (resetFilters) => set({ resetFilters }),
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

export const useDialogStore = create(() => ({
  nestSubmissions: '0',
  motd: false,
  donorPage: false,
  search: false,
  userProfile: false,
}))
