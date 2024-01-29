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
 *  human: Partial<import("@rm/types").PoracleHuman>
 *  profile: import("@rm/types").PoracleProfile[]
 *  pokemon: import("@rm/types").PoraclePokemon[]
 *  raid: import("@rm/types").PoracleRaid[]
 *  egg: import("@rm/types").PoracleEgg[]
 *  invasion: import("@rm/types").PoracleInvasion[]
 *  lure: import("@rm/types").PoracleLure[]
 *  nest: import("@rm/types").PoracleNest[]
 *  quest: import("@rm/types").PoracleQuest[]
 *  gym: import("@rm/types").PoracleGym[]
 *  category: keyof import("@rm/types").PoracleUI
 *  context: Partial<import("@rm/types").PoracleClientContext>
 *  groupedAreas: Record<string, import('@turf/helpers').Feature[]>
 *  trackedSearch: string
 *  selected: Record<string, boolean>
 *  tempFilters: Record<string, any>
 *  advanced: {
 *    id: string
 *    category: string
 *    selectedIds: string[]
 *    open: boolean
 *    onClose?: (newFilters: object, save?: boolean) => void
 *  }
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
  tempFilters: {},
  advanced: {
    id: '',
    category: '',
    selectedIds: [],
    open: false,
    onClose: () => {},
  },
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

/** @param {string} [id] */
export const setSelected = (id) => () => {
  useWebhookStore.setState((prev) => ({
    selected: id ? { ...prev.selected, [id]: !prev.selected[id] } : {},
  }))
}

/**
 * @param {boolean} enabled
 * @param {string[]} ids
 */
export const applyToAllWebhooks = (enabled, ids) => {
  const selected = new Set(ids)
  useWebhookStore.setState((prev) => ({
    tempFilters: Object.fromEntries(
      Object.entries(prev.tempFilters).map(([k, v]) => [
        k,
        selected.has(k) ? { ...v, enabled } : v,
      ]),
    ),
  }))
}
