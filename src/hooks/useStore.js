import Utility from '@services/Utility'
import { setDeep } from '@services/functions/setDeep'
import dlv from 'dlv'
import { useCallback, useMemo } from 'react'
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
 *   searches: Record<string, string>,
 *   menus: Record<string, boolean>,
 *   holidayEffects: Record<string, boolean>,
 *   motdIndex: number
 *   tutorial: boolean,
 *   searchTab: string,
 *   search: string,
 *   filters: import('@rm/types').AllFilters,
 *   icons: Record<string, string>
 *   audio: Record<string, string>
 *   userSettings: Record<string, any>
 *   profiling: boolean
 *   stateLogging: boolean
 *   desktopNotifications: boolean
 *   setAreas: (areas: string | string[], validAreas: string[], unselectAll?: boolean) => void,
 *   setPokemonFilterMode: (legacyFilter: boolean, easyMode: boolean) => void,
 *   getPokemonFilterMode: () => 'basic' | 'intermediate' | 'expert',
 * }} UseStore
 *
 * @typedef {import('@rm/types').Paths<UseStore>} UseStorePaths
 * @typedef {import('@rm/types').ConfigPathValue<UseStore, UseStorePaths>} UseStoreValues
 *
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
      getPokemonFilterMode: () => {
        const { filters, userSettings } = get()
        return filters?.pokemon?.easyMode
          ? 'basic'
          : userSettings?.pokemon?.legacyFilter
          ? 'expert'
          : 'intermediate'
      },
      setPokemonFilterMode: (legacyFilter, easyMode) => {
        set((prev) => ({
          userSettings: {
            ...prev.userSettings,
            pokemon: {
              ...prev.userSettings.pokemon,
              legacyFilter,
              linkGlobalAndAdvanced: !legacyFilter,
            },
          },
          filters: {
            ...prev.filters,
            pokemon: {
              ...prev.filters.pokemon,
              easyMode,
            },
          },
        }))
      },
      holidayEffects: {},
      settings: {},
      searches: {},
      userSettings: {},
      icons: {},
      audio: {},
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
      profiling: false,
      stateTraceLog: false,
    }),
    {
      name: 'local-state',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)

/**
 * @template {UseStorePaths} T
 * @param {T} field
 * @param {import('@rm/types').ConfigPathValue<UseStore, T>} [defaultValue]
 * @returns {import('@rm/types').ConfigPathValue<UseStore, T>}
 */
export function useGetDeepStore(field, defaultValue) {
  return useStore((s) => dlv(s, field, defaultValue))
}

/**
 * @template {UseStorePaths} T
 * @param {T} field
 * @param {import('@rm/types').ConfigPathValue<UseStore, T>} value
 * @returns {void}
 */
export function setDeepStore(field, value) {
  return useStore.setState((s) => setDeep(s, field, value))
}

/**
 * @template {UseStorePaths} Paths
 * @template {import('@rm/types').ConfigPathValue<UseStore, Paths>} T
 * @template {T | ((prevValue: T) => T) | keyof T} U
 * @template {(arg1: U, ...rest: (U extends keyof T ? [arg2: T[U]] : [arg2?: never])) => void} SetDeep
 * @param {Paths} field
 * @param {import('@rm/types').ConfigPathValue<UseStore, Paths>} [defaultValue]
 * @returns {[import('@rm/types').ConfigPathValue<UseStore, Paths>, SetDeep]}
 */
export function useDeepStore(field, defaultValue) {
  const value = useGetDeepStore(field, defaultValue)

  const callback = useCallback(
    /** @type {SetDeep} */ (
      (...args) => {
        const [first, ...rest] = field.split('.')
        const corrected = rest.length ? rest.join('.') : first
        const key = typeof args[0] === 'string' && args[1] ? args[0] : ''
        const path = key ? `${corrected}.${key}` : corrected
        return useStore.setState((prev) => {
          const nextValue =
            args.length === 1
              ? typeof args[0] === 'function'
                ? args[0](dlv(prev, field, defaultValue))
                : args[0]
              : args[1]
          if (process.env.NODE_ENV === 'development' && prev.stateLogging) {
            // eslint-disable-next-line no-console
            console.trace(field, {
              first,
              rest,
              corrected,
              key,
              path,
              nextValue,
            })
          }
          return {
            [first]:
              first === path
                ? nextValue
                : setDeep(prev[first], path, nextValue),
          }
        })
      }
    ),
    [field, defaultValue],
  )
  return useMemo(() => [value, callback], [value, callback])
}

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
 *  },
 * }} UseStatic
 *
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
 * }} UseLayoutStore
 *
 * @type {import("zustand").UseBoundStore<import("zustand").StoreApi<UseLayoutStore>>}
 */
export const useLayoutStore = create(() => ({
  nestSubmissions: '0',
  motd: false,
  donorPage: false,
  search: false,
  userProfile: false,
  resetFilters: false,
  feedback: false,
  drawer: false,
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
 * @template {string | number | boolean} T
 * @param {T[]} p
 * @param {T[]} n
 * @returns {boolean}
 */
export const basicEqualFn = (p, n) => p.every((v, i) => v === n[i])
