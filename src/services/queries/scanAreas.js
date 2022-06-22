import { gql } from '@apollo/client'

export const getAllScanAreas = gql`
  query ScanAreas($version: String) {
    scanAreas(version: $version) {
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
  query ScanAreasMenu($version: String) {
    scanAreasMenu(version: $version) {
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
