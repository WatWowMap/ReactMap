import { create } from 'zustand'

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
 *   menus: Record<string, any>
 *   filters: import('@rm/types').AllFilters,
 *   masterfile: import('@rm/masterfile').Masterfile
 *   polling: import('@rm/types').Config['api']['polling'],
 *   gymValidDataLimit: number
 *   settings: Record<keyof import('./useStorage').UseStorage['settings'], { name: string }>
 *   userSettings: Record<string, any>
 *   clientError: string,
 *   timeOfDay: import('@rm/types').TimesOfDay,
 *   hideList: Set<string | number>,
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
  menus: {},
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
 * @template {string | number | boolean} T
 * @param {T[]} p
 * @param {T[]} n
 * @returns {boolean}
 */
export const basicEqualFn = (p, n) =>
  p.length === n.length && p.every((v, i) => v === n[i])
