import create from 'zustand'
import { persist } from 'zustand/middleware'

const useStore = create(persist(set => ({
  location: undefined,
  setLocation: (location) => set({ location }),
  zoom: undefined,
  setZoom: (zoom) => set({ zoom }),
  filters: undefined,
  setFilters: (filters) => set({ filters }),
  settings: undefined,
  setSettings: (settings) => set({ settings }),
  menus: undefined,
  setMenus: (menus) => set({ menus }),
}),
{
  name: 'local-state',
  getStorage: () => localStorage,
}))

const useMasterfile = create(set => ({
  config: undefined,
  setConfig: (config) => set({ config }),
  available: undefined,
  setAvailable: (available) => set({ available }),
  availableForms: undefined,
  setAvailableForms: (availableForms) => set({ availableForms }),
  ui: {},
  setUi: (ui) => set({ ui }),
  perms: {},
  setPerms: (perms) => set({ perms }),
  masterfile: {},
  setMasterfile: (masterfile) => set({ masterfile }),
  breakpoint: false,
  setBreakpoint: (breakpoint) => set({ breakpoint }),
  hideList: [],
  setHideList: (hideList) => set({ hideList }),
  excludeList: [],
  setExcludeList: (excludeList) => set({ excludeList }),
}))

export { useStore, useMasterfile }
