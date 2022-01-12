import { gql } from '@apollo/client'

const getAllScanAreas = gql`
query ScanAreas {
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

export default getAllScanAreas
