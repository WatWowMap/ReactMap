import dlv from 'dlv'
import { useMemo } from 'react'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

import { setDeep } from '@utils/setDeep'
import type { AllFilters, ObjectPathValue, OnlyType, Paths } from '@rm/types'

export interface UseStorage {
  darkMode: boolean
  location: [number, number]
  popups: Record<string, boolean>
  zoom: number
  sidebar: string
  scanAreasMenu: string
  selectedWebhook: string
  settings: {
    navigationControls: 'react' | 'leaflet'
    navigation: string
    tileServers: string
    distanceUnit: 'kilometers' | 'miles'
  }
  advMenu: {
    pokemon: string
    gyms: string
    pokestops: string
    nests: string
    stations: string
  }
  searches: Record<string, string>
  tabs: Record<string, number>
  expanded: Record<string, boolean>
  menus: Partial<
    ReturnType<(typeof import('@rm/server/src/ui/advMenus'))['advMenus']>
  >
  holidayEffects: Record<string, boolean>
  motdIndex: number
  tutorial: boolean
  searchTab: string
  search: string
  filters: Partial<AllFilters>
  icons: Record<string, string>
  audio: Record<string, string>
  userSettings: Partial<
    ReturnType<
      (typeof import('@rm/server/src/ui/clientOptions'))['clientOptions']
    >['clientValues']
  >
  profiling: boolean
  stateTraceLog: boolean
  desktopNotifications: boolean
  setAreas: (
    areas?: string | string[],
    validAreas?: string[],
    unselectAll?: boolean,
  ) => void
  setPokemonFilterMode: (legacyFilter: boolean, easyMode: boolean) => void
  getPokemonFilterMode: () => 'basic' | 'intermediate' | 'expert'
  webhookAdv: Record<string, boolean>
}

export type UseStorageNoFn = OnlyType<UseStorage, Function, false>

export type UseStoragePaths = Paths<UseStorageNoFn>

export type UseStorageValues = ObjectPathValue<UseStorageNoFn, UseStoragePaths>

export const useStorage = create<UseStorage>()(
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
        distanceUnit: 'kilometers',
        navigation: '',
        navigationControls: 'leaflet',
        tileServers: '',
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

export function useGetDeepStore<T extends UseStoragePaths>(
  field: T,
  defaultValue: ObjectPathValue<UseStorageNoFn, T>,
): ObjectPathValue<UseStorageNoFn, T> {
  return useStorage((s) => dlv(s, field, defaultValue))
}

export function setDeepStore<T extends UseStoragePaths>(
  field: T,
  value: ObjectPathValue<UseStorageNoFn, T>,
) {
  return useStorage.setState((s) => setDeep(s, field, value))
}

export function useDeepStore<
  T extends UseStoragePaths,
  U extends ObjectPathValue<UseStorageNoFn, T>,
  V extends U | ((prevValue: U) => U) | (U extends object ? keyof U : never),
>(
  field: T,
  defaultValue?: ObjectPathValue<UseStorageNoFn, T>,
): [
  ObjectPathValue<UseStorageNoFn, T>,
  (arg1: V, ...rest: V extends keyof U ? [arg2: U[V]] : [arg2?: never]) => void,
] {
  const value = useGetDeepStore(field, defaultValue)

  return useMemo(
    () => [
      value,
      (...args) => {
        const [first, ...rest] = field.split('.')
        const corrected = rest.length ? rest.join('.') : first
        const key = typeof args[0] === 'string' && args[1] ? args[0] : ''
        const path = key ? `${corrected}.${key}` : corrected

        return useStorage.setState((prev) => {
          const prevValue = dlv(prev, field, value)

          const nextValue =
            args.length === 1
              ? typeof args[0] === 'function'
                ? args[0](prevValue)
                : args[0]
              : args[1]

          if (process.env.NODE_ENV === 'development' && prev.stateTraceLog) {
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
      },
    ],
    [value, field],
  )
}
