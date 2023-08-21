// @ts-check
import { createContext } from 'react'

export const DEFAULT = /** @type {import('@hooks/useStore').ScanConfig} */ ({
  scannerType: '',
  showScanCount: false,
  showScanQueue: false,
  advancedOptions: false,
  enabled: false,
  pokemonRadius: 70,
  gymRadius: 750,
  spacing: 1,
  maxSize: 10,
  cooldown: 0,
  refreshQueue: 5,
})

export const ConfigContext = createContext(DEFAULT)
