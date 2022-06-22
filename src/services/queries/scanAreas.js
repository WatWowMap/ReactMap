import { gql } from '@apollo/client'

export const getAllScanAreas = gql`
  query ScanAreas() {
    scanAreas {
      type
      features {
        type
        properties
        geometry {
          type
          coordinates
        }
      }
    }
  }
`

export const getScanAreasMenu = gql`
  query ScanAreasMenu {
    scanAreasMenu {
      name
      details {
        properties
      }
      children {
        properties
      }
    }
  }
`
