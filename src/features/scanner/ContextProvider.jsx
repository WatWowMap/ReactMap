// @ts-check
import { createContext } from 'react'

export const DEFAULT = /** @type {import('./hooks/store').ScanConfig} */ ({
  scannerType: '',
  showScanCount: false,
  showScanQueue: false,
  advancedOptions: false,
  enabled: false,
  pokemonRadius: 70,
  gymRadius: 750,
  spacing: 1,
  maxSize: 1,
  cooldown: 1,
  refreshQueue: 5,
})

export const ConfigContext = createContext(DEFAULT)
