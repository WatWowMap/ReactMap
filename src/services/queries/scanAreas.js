import { gql } from '@apollo/client'

export const GET_ALL_SCAN_AREAS = gql`
  query ScanAreas {
    scanAreas {
      type
      features
    }
  }
`

export const GET_SCAN_AREAS_MENU = gql`
  query ScanAreasMenu {
    scanAreasMenu {
      name
      details
      children
    }
  }
`
