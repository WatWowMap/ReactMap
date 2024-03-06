import { gql } from '@apollo/client'

export const GET_ALL_SCAN_CELLS = gql`
  query ScanCells(
    $minLat: Float!
    $minLon: Float!
    $maxLat: Float!
    $maxLon: Float!
    $zoom: Int!
    $filters: JSON
  ) {
    scanCells(
      minLat: $minLat
      minLon: $minLon
      maxLat: $maxLat
      maxLon: $maxLon
      zoom: $zoom
      filters: $filters
    ) {
      id
      center_lat
      center_lon
      updated
      polygon
    }
  }
`
