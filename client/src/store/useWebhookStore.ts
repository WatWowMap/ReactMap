// @ts-check
import { apolloClient } from '@services/apollo'
import { SET_HUMAN, WEBHOOK_AREAS } from '@services/queries/webhook'
import { create } from 'zustand'

export interface WebhookStore {
  mode: '' | 'areas' | 'location' | 'open'
  location: [number, number]
  selectedAreas: string[]
  data: any
  alert: {
    open: boolean
    severity: import('@mui/material/Alert').AlertProps['severity']
    message: string | import('react').ReactNode
  }
  multipleHooks: boolean
  human: Partial<import('@rm/types').PoracleHuman>
  profile: import('@rm/types').PoracleProfile[]
  pokemon: import('@rm/types').PoraclePokemon[]
  raid: import('@rm/types').PoracleRaid[]
  egg: import('@rm/types').PoracleEgg[]
  invasion: import('@rm/types').PoracleInvasion[]
  lure: import('@rm/types').PoracleLure[]
  nest: import('@rm/types').PoracleNest[]
  quest: import('@rm/types').PoracleQuest[]
  gym: import('@rm/types').PoracleGym[]
  category: keyof import('@rm/types').PoracleUI
  context: Partial<import('@rm/types').PoracleClientContext>
  groupedAreas: Record<string, import('geojson').Feature[]>
  trackedSearch: string
  selected: Record<string, boolean>
  tempFilters: Record<string, any>
  profileLoading: null | number
  advanced: {
    id: string
    uid: number
    category: string
    selectedIds: string[]
    open: boolean
    onClose?: (newFilters: object, save?: boolean) => void
  }
}

export const useWebhookStore = create<WebhookStore>(() => ({
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
  profileLoading: null,
  advanced: {
    id: '',
    uid: 0,
    category: '',
    selectedIds: [],
    open: false,
    onClose: () => {},
  },
}))

export const setLocation = (location: WebhookStore['location']) =>
  useWebhookStore.setState({ location })

export const setMode = (mode: WebhookStore['mode'] = '') =>
  useWebhookStore.setState({ mode: typeof mode === 'string' ? mode : '' })

export const setModeBtn = (mode: WebhookStore['mode']) => () => setMode(mode)

export const setSelectedAreas = (
  selectedAreas: WebhookStore['selectedAreas'],
) =>
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

export function getContext<T extends WebhookStore['category']>(
  category: T,
): WebhookStore['context']['ui'][T] {
  return useWebhookStore.getState().context.ui[category]
}

export function setTrackedSearch(trackedSearch: string) {
  useWebhookStore.setState({ trackedSearch })
}

export const setSelected = (id?: string) => () => {
  useWebhookStore.setState((prev) => ({
    selected: id ? { ...prev.selected, [id]: !prev.selected[id] } : {},
  }))
}

export const applyToAllWebhooks = (enabled: boolean, ids: string[]) => {
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

export const handleClick =
  (areaName: string, groupName: string = '') =>
  async () => {
    const areas: { group: string; children: string[] }[] =
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
