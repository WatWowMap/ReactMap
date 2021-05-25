import { gql } from '@apollo/client'

const getAllScanAreas = gql`
query Data {
  scanAreas {
    type
    properties
    geometry
    features
  }
}
`

export default getAllScanAreas
