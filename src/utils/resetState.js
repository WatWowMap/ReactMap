// @ts-check
import { useMemory } from '@store/useMemory'
import { useStorage } from '@store/useStorage'
import { SETTINGS_SYNC_KEY, markSyncDirty } from '@hooks/useSettingsSync'

// resets also run outside the map (the data page, /reset), where nothing
// notices the change, so they are marked to be saved for synced settings

/** @param {keyof import('@store/useStorage').UseStorage & keyof import('@store/useMemory').UseMemory} key */
const resetState = (key) => {
  const memoryState = useMemory.getState()
  const state = memoryState[key]
  useStorage.setState({
    [key]:
      key === 'settings'
        ? Object.fromEntries(
            Object.entries(state).map(([k, v]) => {
              const defaultSetting = memoryState.config?.misc?.[k]
              return [
                k,
                defaultSetting !== undefined && defaultSetting in v
                  ? defaultSetting
                  : Object.keys(v)[0],
              ]
            }),
          )
        : structuredClone(state),
  })
  markSyncDirty()
}

/** @param {'Audio' | 'Icons'} key */
const resetAssets = (key) => {
  useMemory.setState({ [key]: null })
  useStorage.setState({ [key.toLowerCase()]: {} })
  markSyncDirty()
}

export const resetSettings = () => resetState('settings')

export const resetMenus = () => resetState('menus')

export const resetUserSettings = () => resetState('userSettings')

export const resetFilters = () => resetState('filters')

export const resetIcons = () => resetAssets('Icons')

export const resetAudio = () => resetAssets('Audio')

export const resetUI = () => {
  useStorage.setState({
    holidayEffects: {},
    enhancedGraphics: true,
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
  markSyncDirty()
}

export const resetLocation = () => {
  const { config } = useMemory.getState()
  useStorage.setState({
    location: [config.general.startLat || 0, config.general.startLon || 0],
    zoom: config.general.startZoom || 18,
  })
  markSyncDirty()
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
  markSyncDirty()
}

export const hardReset = () => {
  // the sync state survives, so the reset is saved instead of the old
  // settings being loaded back from the server
  const sync = localStorage.getItem(SETTINGS_SYNC_KEY)
  localStorage.clear()
  sessionStorage.clear()
  if (sync) localStorage.setItem(SETTINGS_SYNC_KEY, sync)
  resetAllGeneral()
  resetFilters()
  // the reset replaces the synced settings, even if they are newer
  markSyncDirty(true)
}
