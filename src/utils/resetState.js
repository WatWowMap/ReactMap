// @ts-check
import { useMemory } from '@store/useMemory'
import { useStorage } from '@store/useStorage'

/** @param {keyof import('@store/useStorage').UseStorage & keyof import('@store/useMemory').UseMemory} key */
const resetState = (key) => {
  const state = useMemory.getState()[key]
  useStorage.setState({
    [key]:
      key === 'settings'
        ? Object.fromEntries(
            Object.entries(state).map(([k, v]) => [k, Object.keys(v)[0]]),
          )
        : structuredClone(state),
  })
}

/** @param {'Audio' | 'Icons'} key */
const resetAssets = (key) => {
  useMemory.setState({ [key]: null })
  useStorage.setState({ [key.toLowerCase()]: {} })
}

export const resetSettings = () => resetState('settings')

export const resetMenus = () => resetState('menus')

export const resetUserSettings = () => resetState('userSettings')

export const resetFilters = () => resetState('filters')

export const resetIcons = () => resetAssets('Icons')

export const resetAudio = () => resetAssets('Audio')

export const resetUI = () =>
  useStorage.setState({
    holidayEffects: {},
    tabs: {},
    searches: {},
    popups: {},
    search: '',
    searchTab: '',
    sidebar: '',
    scanAreasMenu: '',
    motdIndex: 0,
    profiling: false,
    tutorial: false,
    stateTraceLog: false,
    darkMode: !!window?.matchMedia('(prefers-color-scheme: dark)').matches,
  })

export const resetLocation = () => {
  const { config } = useMemory.getState()
  useStorage.setState({
    location: [config.general.startLat || 0, config.general.startLon || 0],
    zoom: config.general.startZoom || 18,
  })
}

export const resetAllGeneral = () => {
  resetSettings()
  resetMenus()
  resetUserSettings()
  resetIcons()
  resetAudio()
  resetUI()
  resetLocation()
}

/** @param {import('@rm/types').Categories} key */
export const resetFilter = (key) => {
  const reference = useMemory.getState().filters[key]
  useStorage.setState((prev) => ({
    filters: { ...prev.filters, [key]: structuredClone(reference) },
  }))
}

export const hardReset = () => {
  localStorage.clear()
  sessionStorage.clear()
  resetAllGeneral()
  resetFilters()
}
