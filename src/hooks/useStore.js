import create from 'zustand'
import { persist } from 'zustand/middleware'

const useStore = create(persist(set => ({
  location: undefined,
  setLocation: (location) => set({ location }),
  zoom: undefined,
  setZoom: (zoom) => set({ zoom }),
  config: undefined,
  setConfig: (config) => set({ config }),
  filters: undefined,
  setFilters: (filters) => set({ filters }),
  settings: undefined,
  setSettings: (settings) => set({ settings }),
  availableForms: undefined,
  setAvailableForms: (availableForms) => set({ availableForms }),
}),
{
  name: 'local-state',
  getStorage: () => localStorage,
}))

const useMasterfile = create(set => ({
  masterfile: {},
  setMasterfile: (masterfile) => set({ masterfile }),
}))

export { useStore, useMasterfile }
