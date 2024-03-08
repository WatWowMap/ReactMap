import { create } from 'zustand'

/**
 * @typedef {{ map: import('leaflet').Map | null }} UseMapStore
 * @type {import("zustand").UseBoundStore<import("zustand").StoreApi<UseMapStore>>}
 */
export const useMapStore = create(() => ({ map: null }))
