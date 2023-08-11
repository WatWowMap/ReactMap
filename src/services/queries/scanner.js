import { gql } from '@apollo/client'

export const SCANNER_STATUS = gql`
  query Scanner($category: String!, $method: String!, $data: JSON!) {
    scanner(category: $category, method: $method, data: $data) {
      status
      message
    }
  }
`

export const SCANNER_CONFIG = gql`
  query ScannerConfig($mode: String) {
    scannerConfig(mode: $mode) {
      scannerType
      showScanCount
      showScanQueue
      cooldown
      advancedOptions
      pokemonRadius
      gymRadius
      spacing
      maxSize
      refreshQueue
      enabled
    }
  }
`

export const CHECK_VALID_SCAN = gql`
  query CheckValidScan($center: [Float!]!, $mode: String) {
    checkValidScan(center: $center, mode: $mode)
  }
`
