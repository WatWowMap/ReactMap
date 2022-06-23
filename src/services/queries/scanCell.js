import { gql } from '@apollo/client'

const getAllScanCells = gql`
  query ScanCells(
    $minLat: Float!
    $minLon: Float!
    $maxLat: Float!
    $maxLon: Float!
    $zoom: Int!
  ) {
    scanCells(
      minLat: $minLat
      minLon: $minLon
      maxLat: $maxLat
      maxLon: $maxLon
      zoom: $zoom
    ) {
      id
      center_lat
      center_lon
      updated
      polygon
    }
  }
`

export default getAllScanCells
