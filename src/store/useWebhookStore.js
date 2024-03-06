// @ts-check
import { apolloClient } from '@services/apollo'
import { SET_HUMAN, WEBHOOK_AREAS } from '@services/queries/webhook'
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
 *    uid: number
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
    uid: 0,
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

/** @param {string} areaName @param {string} [groupName] */
export const handleClick =
  (areaName, groupName = '') =>
  async () => {
    /** @type {{ group: string, children: string[] }[]} */
    const areas =
      apolloClient.cache.readQuery({
        query: WEBHOOK_AREAS,
      }).webhookAreas || []
    const incomingArea = areaName.toLowerCase()
    const { human } = useWebhookStore.getState()
    const existing = human.area || []
    const foundGroup = areas.find((group) => group.group === groupName) || {
      children: [],
      group: '',
    }
    const withLowerCase = {
      group: foundGroup.group,
      children: foundGroup.children.map((a) => a.toLowerCase()),
    }

    let newAreas = []
    if (incomingArea === 'all') {
      newAreas = withLowerCase.group
        ? [...existing, ...withLowerCase.children]
        : areas.flatMap((group) => group.children)
    } else if (incomingArea === 'none') {
      newAreas = groupName
        ? existing.filter((a) => !withLowerCase.children.includes(a))
        : []
    } else {
      newAreas = existing.includes(incomingArea)
        ? existing.filter((a) => a !== incomingArea)
        : [...existing, incomingArea]
    }
    newAreas = [...new Set(newAreas)]

    await apolloClient
      .mutate({
        mutation: SET_HUMAN,
        variables: {
          category: 'setAreas',
          data: newAreas,
          status: 'POST',
        },
      })
      .then(({ data }) => {
        if (data?.webhook?.human) {
          useWebhookStore.setState({ human: data.webhook.human })
        }
      })
    return newAreas
  }
