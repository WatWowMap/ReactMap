import { useStore } from '@hooks/useStore'
import { create } from 'zustand'
/**
 * TODO: Finish this
 * @typedef {{}} MutationVars
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
 *  send: boolean
 *  groupedAreas: Record<string, import('@turf/helpers').Feature[]>
 * }} WebhookStore
 * @type {import("zustand").UseBoundStore<import("zustand").StoreApi<WebhookStore>>}
 */
export const useWebhookStore = create(() => ({
  data: {},
  mode: '',
  location: [0, 0],
  selectedAreas: [],
  alert: {
    open: false,
    severity: 'info',
    message: '',
  },
  send: false,
  groupedAreas: {},
}))

/** @param {WebhookStore['location']} location */
export const setLocation = (location) => useWebhookStore.setState({ location })

/** @param {WebhookStore['mode']} [mode] */
export const setMode = (mode = '') => useWebhookStore.setState({ mode })
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

/** @param {WebhookStore['send']} send */
export const setSend = (send) => useWebhookStore.setState({ send })

/**
 * Updates the data for the selected webhook
 * Either with a category or the entire data object
 * @param {WebhookStore['data']} data
 * @param {WebhookStore['category']} [category]
 */
export const setData = (incoming, category) => {
  const { selectedWebhook } = useStore.getState()
  if (!selectedWebhook) return
  useWebhookStore.setState(({ data }) => ({
    data: {
      ...data,
      [selectedWebhook]: {
        ...data[selectedWebhook],
        ...(category ? { [category]: incoming } : incoming),
      },
    },
  }))
}

export const resetAlert = () =>
  useWebhookStore.setState({
    alert: {
      open: false,
      severity: 'info',
      message: '',
    },
  })
