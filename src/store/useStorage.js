// @ts-check

import dlv from 'dlv'
import { useCallback, useMemo } from 'react'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

import { setDeep } from '@utils/setDeep'

/**
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
 *   advMenu: {
 *    pokemon: string,
 *    gyms: string,
 *    pokestops: string,
 *    nests: string,
 *    stations: string,
 *   }
 *   searches: Record<string, string>,
 *   tabs: Record<string, number>,
 *   expanded: Record<string, boolean>,
 *   menus: Partial<ReturnType<import('server/src/ui/advMenus')['advMenus']>>
 *   holidayEffects: Record<string, boolean>,
 *   motdIndex: number
 *   tutorial: boolean,
 *   searchTab: string,
 *   search: string,
 *   filters: Partial<import('@rm/types').AllFilters>,
 *   icons: Record<string, string>
 *   audio: Record<string, string>
 *   userSettings: Partial<ReturnType<import('server/src/ui/clientOptions')['clientOptions']>['clientValues']>
 *   profiling: boolean
 *   stateTraceLog: boolean
 *   desktopNotifications: boolean
 *   setAreas: (areas?: string | string[], validAreas?: string[], unselectAll?: boolean) => void,
 *   setPokemonFilterMode: (legacyFilter: boolean, easyMode: boolean) => void,
 *   getPokemonFilterMode: () => 'basic' | 'intermediate' | 'expert',
 *   webhookAdv: Record<string, boolean>,
 * }} UseStorage
 *
 * @typedef {import('@rm/types').OnlyType<UseStorage, Function, false>} UseStorageNoFn
 * @typedef {import('@rm/types').Paths<UseStorageNoFn>} UseStoragePaths
 * @typedef {import('@rm/types').ObjectPathValue<UseStorageNoFn, UseStoragePaths>} UseStorageValues
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
        return filters?.pokemon?.easyMode &&
          !userSettings?.pokemon?.legacyFilter
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
      settings: {
        // distanceUnit: 'kilometers',
        // navigation: 'leaflet',
        // navigationControls: 'leaflet',
        // tileServers: 'default',
      },
      searches: {},
      tabs: {},
      expanded: {},
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
        stations: 'others',
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
      desktopNotifications: false,
      selectedWebhook: '',
    }),
    {
      name: 'local-state',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)

/** @type {import('@rm/types').useGetDeepStore} */
export function useGetDeepStore(field, defaultValue) {
  return useStorage((s) => dlv(s, field, defaultValue))
}

/** @type {import('@rm/types').useSetDeepStore} */
export function setDeepStore(field, value) {
  return useStorage.setState((s) => setDeep(s, field, value))
}

/** @type {import('@rm/types').useDeepStore} */
export function useDeepStore(field, defaultValue) {
  const value = useGetDeepStore(field, defaultValue)

  const callback = useCallback(
    /** @type {ReturnType<import('@rm/types').useDeepStore>[1]} */ (
      (...args) => {
        const [first, ...rest] = field.split('.')
        const corrected = rest.length ? rest.join('.') : first
        const key = typeof args[0] === 'string' && args[1] ? args[0] : ''
        const path = key ? `${corrected}.${key}` : corrected

        return useStorage.setState((prev) => {
          const prevValue = dlv(prev, field, defaultValue)

          const nextValue =
            args.length === 1
              ? typeof args[0] === 'function'
                ? args[0](prevValue)
                : args[0]
              : args[1]

          if (process.env.NODE_ENV === 'development' && prev.stateTraceLog) {
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

  // @ts-ignore
  return useMemo(() => [value, callback], [value, callback])
}
