import create from 'zustand'
import { persist } from 'zustand/middleware'

const useStore = create(persist(set => ({
  config: undefined,
  setConfig: (config) => set({ config }),
  masterfile: {},
  setMasterfile: (masterfile) => set({ masterfile }),
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

export default useStore
