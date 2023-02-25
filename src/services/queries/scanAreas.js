import { gql } from '@apollo/client'

export const getAllScanAreas = gql`
  query ScanAreas {
    scanAreas {
      type
      features
    }
  }
`

export const getScanAreasMenu = gql`
  query ScanAreasMenu {
    scanAreasMenu {
      name
      details
      children
    }
  }
`
