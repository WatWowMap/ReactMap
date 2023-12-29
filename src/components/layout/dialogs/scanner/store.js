import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/**
 * @typedef {'scanNext' | 'scanZone'} ScanMode
 * @typedef {'' | 'mad' | 'rdm' | 'custom'} ScannerType
 * @typedef {{
 *   scannerType: ScannerType,
 *   showScanCount: boolean,
 *   showScanQueue: boolean,
 *   advancedOptions: boolean,
 *   pokemonRadius: number,
 *   gymRadius: number,
 *   spacing: number,
 *   maxSize: number,
 *   cooldown: number,
 *   refreshQueue: number
 *   enabled: boolean,
 * }} ScanConfig
 * @typedef {{
 *  scanNextMode: '' | 'setLocation' | 'sendCoords' | 'loading' | 'confirmed' | 'error',
 *  scanZoneMode: UseScanStore['scanNextMode']
 *  queue: 'init' | '...' | number,
 *  scanLocation: [number, number],
 *  scanCoords: [number, number][],
 *  validCoords: boolean[],
 *  scanNextSize: 'S' | 'M' | 'L' | 'XL',
 *  scanZoneSize: number,
 *  userRadius: number,
 *  userSpacing: number,
 *  valid: 'none' | 'some' | 'all',
 *  estimatedDelay: number,
 *  setScanMode: <T extends `${ScanMode}Mode`>(mode: T, nextMode?: UseScanStore[T]) => void,
 *  setScanSize: <T extends `${ScanMode}Size`>(mode: T, size: UseScanStore[T]) => void,
 * }} UseScanStore
 * @type {import("zustand").UseBoundStore<import("zustand").StoreApi<UseScanStore>>}
 */
export const useScanStore = create((set) => ({
  scanNextMode: '',
  scanZoneMode: '',
  queue: 'init',
  scanLocation: [0, 0],
  scanCoords: [],
  validCoords: [],
  scanNextSize: 'S',
  scanZoneSize: 1,
  userRadius: 70,
  userSpacing: 1,
  valid: 'none',
  estimatedDelay: 0,
  setScanMode: (mode, nextMode = '') => set({ [mode]: nextMode }),
  setScanSize: (mode, size) => set({ [mode]: size }),
}))

export const useScannerSessionStorage = create(
  persist(
    () => ({
      cooldown: 0,
    }),
    {
      name: 'scanner',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
)
