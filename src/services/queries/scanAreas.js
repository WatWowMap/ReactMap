import { gql } from '@apollo/client'

const getAllScanAreas = gql`
query Data {
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
