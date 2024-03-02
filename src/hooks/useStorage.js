import { setDeep } from '@utils/setDeep'
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
 *   scanAreasMenu: string,
 *   selectedWebhook: string,
 *   settings: {
 *    navigationControls: 'react' | 'leaflet'
 *    navigation: string,
 *    tileServers: string
 *    distanceUnit: 'kilometers' | 'miles'
 *   },
 *   searches: Record<string, string>,
 *   tabs: Record<string, number>,
 *   menus: ReturnType<import('server/@services/ui/advMenus')>
 *   holidayEffects: Record<string, boolean>,
 *   motdIndex: number
 *   tutorial: boolean,
 *   searchTab: string,
 *   search: string,
 *   filters: import('@rm/types').AllFilters,
 *   icons: Record<string, string>
 *   audio: Record<string, string>
 *   userSettings: ReturnType<import('server/@services/ui/clientOptions')>['clientValues']
 *   profiling: boolean
 *   stateTraceLog: boolean
 *   desktopNotifications: boolean
 *   setAreas: (areas?: string | string[], validAreas?: string[], unselectAll?: boolean) => void,
 *   setPokemonFilterMode: (legacyFilter: boolean, easyMode: boolean) => void,
 *   getPokemonFilterMode: () => 'basic' | 'intermediate' | 'expert',
 * }} UseStorage
 *
 * @typedef {import('@rm/types').Paths<UseStorage>} UseStoragePaths
 * @typedef {import('@rm/types').ConfigPathValue<UseStorage, UseStoragePaths>} UseStorageValues
 *
 * @type {import("zustand").UseBoundStore<import("zustand").StoreApi<UseStorage>>}
 */
export const useStorage = create(
  persist(
    (set, get) => ({
      darkMode: !!window?.matchMedia('(prefers-color-scheme: dark)').matches,
      location: [
        CONFIG.map.general.startLat || 0,
        CONFIG.map.general.startLon || 0,
      ],
      zoom: CONFIG.map.general.startZoom,
      filters: {},
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
      tabs: {},
      userSettings: {},
      icons: {},
      audio: {},
      menus: {},
      tutorial: true,
      sidebar: '',
      scanAreasMenu: '',
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
 * @template {UseStoragePaths} T
 * @param {T} field
 * @param {import('@rm/types').ConfigPathValue<UseStorage, T>} [defaultValue]
 * @returns {import('@rm/types').ConfigPathValue<UseStorage, T>}
 */
export function useGetDeepStore(field, defaultValue) {
  return useStorage((s) => dlv(s, field, defaultValue))
}

/**
 * @template {UseStoragePaths} T
 * @param {T} field
 * @param {import('@rm/types').ConfigPathValue<UseStorage, T>} value
 * @returns {void}
 */
export function setDeepStore(field, value) {
  return useStorage.setState((s) => setDeep(s, field, value))
}

/**
 * @template {UseStoragePaths} Paths
 * @template {import('@rm/types').ConfigPathValue<UseStorage, Paths>} T
 * @template {T | ((prevValue: T) => T) | keyof T} U
 * @template {(arg1: U, ...rest: (U extends keyof T ? [arg2: T[U]] : [arg2?: never])) => void} SetDeep
 * @param {Paths} field
 * @param {import('@rm/types').ConfigPathValue<UseStorage, Paths>} [defaultValue]
 * @returns {[import('@rm/types').ConfigPathValue<UseStorage, Paths>, SetDeep]}
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
        return useStorage.setState((prev) => {
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
