import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type ScanMode = 'scanNext' | 'scanZone'

export type ScannerType = '' | 'mad' | 'rdm' | 'custom'

export type ScanConfig = {
  scannerType: ScannerType
  showScanCount: boolean
  showScanQueue: boolean
  advancedOptions: boolean
  pokemonRadius: number
  gymRadius: number
  spacing: number
  maxSize: number
  cooldown: number
  refreshQueue: number
  enabled: boolean
}

export type UseScanStore = {
  scanNextMode:
    | ''
    | 'setLocation'
    | 'sendCoords'
    | 'loading'
    | 'confirmed'
    | 'error'
  scanZoneMode: UseScanStore['scanNextMode']
  queue: 'init' | '...' | number
  scanLocation: [number, number]
  scanCoords: [number, number][]
  validCoords: boolean[]
  scanNextSize: 'S' | 'M' | 'L' | 'XL'
  scanZoneSize: number
  userRadius: number
  userSpacing: number
  valid: 'none' | 'some' | 'all'
  estimatedDelay: number
  setScanMode: <T extends `${ScanMode}Mode`>(
    mode: T,
    nextMode?: UseScanStore[T],
  ) => void
  setScanSize: <T extends `${ScanMode}Size`>(
    mode: T,
    size: UseScanStore[T],
  ) => void
}

export const useScanStore = create<UseScanStore>((set) => ({
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
