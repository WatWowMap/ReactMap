import { create } from 'zustand'

/**
 * TODO: Finish this
 * @typedef {{
 *   isMobile: boolean,
 *   isTablet: boolean,
 *   active: boolean,
 *   online: boolean,
 *   searchLoading: boolean,
 *   Icons: InstanceType<typeof import("../services/Assets").UAssets>,
 *   Audio: InstanceType<typeof import("../services/Assets").UAssets>,
 *   config: import('@rm/types').Config['map'],
 *   ui: import('@rm/types').UIObject,
 *   auth: {
 *    perms: Partial<import('@rm/types').Permissions>,
 *    loggedIn: boolean,
 *    methods: import('@rm/types').Strategy[],
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
 *   glowRules: ((pkmn: import('@rm/types').Pokemon) => string)[],
 *   menus: ReturnType<import('server/src/services/ui/advMenus')>
 *   menuFilters: import('@rm/types').ClientFilterObj,
 *   filters: import('@rm/types').AllFilters,
 *   masterfile: import('@rm/masterfile').Masterfile
 *   polling: import('@rm/types').Config['api']['polling'],
 *   gymValidDataLimit: number
 *   settings: { [K in keyof import('./useStorage').UseStorage['settings']]: Record<string, K extends 'tileServers' ? import('@rm/types').TileLayer : K extends 'navigation' ? { name: string, url: string } : { name: string }> }
 *   userSettings: ReturnType<import('server/src/services/ui/clientOptions')>['clientValues']
 *   clientMenus: ReturnType<import('server/src/services/ui/clientOptions')>['clientMenus']
 *   clientError: string,
 *   timeOfDay: import('@rm/types').TimesOfDay,
 *   hideList: Set<string | number>,
 *   timerList: string[],
 *   tileStyle: import('@rm/types').Theme,
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
 *   advMenuCounts: { [K in keyof import('./useStorage').UseStorage['advMenu']]: { total: number, show: number } }
 *   advMenuFiltered: { [K in keyof import('./useStorage').UseStorage['advMenu']]: string[] }
 * }} UseMemory
 *
 * @type {import("zustand").UseBoundStore<import("zustand").StoreApi<UseMemory>>}
 */
export const useMemory = create(() => ({
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
  glowRules: [],
  config: {
    holidayEffects: [],
    clustering: {},
    customRoutes: {},
    donationPage: {},
    general: {},
    links: {},
    loginPage: {},
    map: {},
    messageOfTheDay: {},
    misc: {},
    theme: {},
  },
  filters: {},
  menus: {},
  clientMenus: {},
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
  timeOfDay: 'day',
  extraUserFields: [],
  manualParams: {
    category: '',
    id: '',
  },
  advMenuCounts: {
    pokemon: { count: 0, show: 0 },
    gyms: { count: 0, show: 0 },
    pokestops: { count: 0, show: 0 },
    nests: { count: 0, show: 0 },
  },
  advMenuFiltered: {
    gyms: [],
    pokestops: [],
    pokemon: [],
    nests: [],
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
