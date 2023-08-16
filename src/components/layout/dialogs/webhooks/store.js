// @ts-check
import { create } from 'zustand'

/**
 * @typedef {{
 *  mode: '' | 'areas' | 'location' | 'open'
 *  location: [number, number]
 *  selectedAreas: string[]
 *  data: any
 *  alert: {
 *   open: boolean
 *   severity: import('@mui/material/Alert').AlertProps['severity']
 *   message: string | import('react').ReactNode
 *  }
 *  multipleHooks: boolean
 *  human: Partial<import('types').PoracleHuman>
 *  profile: import('types').PoracleProfile[]
 *  pokemon: import('types').PoraclePokemon[]
 *  raid: import('types').PoracleRaid[]
 *  egg: import('types').PoracleEgg[]
 *  invasion: import('types').PoracleInvasion[]
 *  lure: import('types').PoracleLure[]
 *  nest: import('types').PoracleNest[]
 *  quest: import('types').PoracleQuest[]
 *  gym: import('types').PoracleGym[]
 *  category: keyof import('types').PoracleUI
 *  context: Partial<import('types').PoracleClientContext>
 *  groupedAreas: Record<string, import('@turf/helpers').Feature[]>
 *  trackedSearch: string
 *  selected: Record<string, boolean>
 * }} WebhookStore
 * @type {import("zustand").UseBoundStore<import("zustand").StoreApi<WebhookStore>>}
 */
export const useWebhookStore = create(() => ({
  data: {},
  mode: '',
  location: [0, 0],
  selectedAreas: [],
  category: 'human',
  human: {
    area: [],
    latitude: 0,
    longitude: 0,
    enabled: false,
  },
  profile: [],
  pokemon: [],
  raid: [],
  egg: [],
  invasion: [],
  lure: [],
  nest: [],
  quest: [],
  gym: [],
  context: {},
  alert: {
    open: false,
    severity: 'info',
    message: '',
  },
  multipleHooks: false,
  groupedAreas: {},
  trackedSearch: '',
  selected: {},
}))

/** @param {WebhookStore['location']} location */
export const setLocation = (location) => useWebhookStore.setState({ location })

/** @param {WebhookStore['mode']} [mode] */
export const setMode = (mode = '') =>
  useWebhookStore.setState({ mode: typeof mode === 'string' ? mode : '' })
/** @param {WebhookStore['mode']} [mode] */
export const setModeBtn = (mode) => () => setMode(mode)

/** @param {WebhookStore['selectedAreas']} selectedAreas */
export const setSelectedAreas = (selectedAreas) =>
  useWebhookStore.setState({
    selectedAreas:
      typeof selectedAreas === 'string'
        ? JSON.parse(selectedAreas)
        : selectedAreas,
  })

export const resetAlert = () =>
  useWebhookStore.setState({
    alert: {
      open: false,
      severity: 'info',
      message: '',
    },
  })

/**
 * @template {WebhookStore['category']} T
 * @param {T} category
 * @returns {WebhookStore['context']['ui'][T]}
 */
export function getContext(category) {
  return useWebhookStore.getState().context.ui[category]
}

/** @param {string} trackedSearch */
export function setTrackedSearch(trackedSearch) {
  useWebhookStore.setState({ trackedSearch })
}

/** @param {string} id */
export const setSelected = (id) => () => {
  useWebhookStore.setState((prev) => ({
    selected: id ? { ...prev.selected, [id]: !prev.selected[id] } : {},
  }))
}
