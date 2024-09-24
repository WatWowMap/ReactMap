// @ts-check

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
 *   config: { [K in keyof Omit<import('@rm/types').Config['map'], 'domain'>]: Partial<Omit<import('@rm/types').Config['map'], 'domain'>[K]> },
 *   ui: Partial<import('@rm/types').UIObject>,
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
 *   menus: Partial<ReturnType<import('server/src/ui/advMenus')['advMenus']>>
 *   menuFilters: import('@rm/types').ClientFilterObj,
 *   filters: Partial<import('@rm/types').AllFilters>,
 *   masterfile: { [K in keyof import('@rm/masterfile').Masterfile]: Partial<import('@rm/masterfile').Masterfile[K]> },
 *   polling: import('@rm/types').Config['api']['polling'],
 *   gymValidDataLimit: number
 *   settings: { [K in keyof import('./useStorage').UseStorage['settings']]: Record<string, K extends 'tileServers' ? import('@rm/types').TileLayer : K extends 'navigation' ? { name: string, url: string } : { name: string }> }
 *   userSettings: Partial<ReturnType<import('server/src/ui/clientOptions')['clientOptions']>['clientValues']>
 *   clientMenus: Partial<ReturnType<import('server/src/ui/clientOptions')['clientOptions']>['clientMenus']>
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
 *     stations: string[],
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
  theme: CONFIG.map.theme,
  polling: CONFIG.api.polling,
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
    excludeList: [],
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
    stations: [],
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
    items: {},
    moves: {},
    quests: {},
    weather: {},
    raids: {},
    teams: {},
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
    pokemon: { count: 0, show: 0, total: 0 },
    gyms: { count: 0, show: 0, total: 0 },
    pokestops: { count: 0, show: 0, total: 0 },
    nests: { count: 0, show: 0, total: 0 },
    stations: { count: 0, show: 0, total: 0 },
  },
  advMenuFiltered: {
    gyms: [],
    pokestops: [],
    pokemon: [],
    nests: [],
    stations: [],
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
