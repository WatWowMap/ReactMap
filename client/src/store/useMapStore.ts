import { create } from 'zustand'

export type UseMapStore = { map: import('leaflet').Map | null }

export const useMapStore = create<UseMapStore>(() => ({ map: null }))
