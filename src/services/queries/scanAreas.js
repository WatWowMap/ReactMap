import { gql } from '@apollo/client'

const getAllScanAreas = gql`
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

export default getAllScanAreas
