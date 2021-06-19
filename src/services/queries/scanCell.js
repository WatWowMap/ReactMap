import { gql } from '@apollo/client'

const getAllScanCells = gql`
  query Data($minLat: Float!, $minLon: Float!, $maxLat: Float!, $maxLon: Float!) {
    scanCells(minLat: $minLat, minLon: $minLon, maxLat: $maxLat, maxLon: $maxLon) {
      id
      center_lat
      center_lon
      updated
      polygon
    }
  }
`

export default getAllScanCells
