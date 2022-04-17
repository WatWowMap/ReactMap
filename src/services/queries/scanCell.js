import { gql } from '@apollo/client'

const getAllScanCells = gql`
  query ScanCells($minLat: Float!, $minLon: Float!, $maxLat: Float!, $maxLon: Float!, $zoom: Int!, $version: String) {
    scanCells(minLat: $minLat, minLon: $minLon, maxLat: $maxLat, maxLon: $maxLon, zoom: $zoom, version: $version) {
      id
      center_lat
      center_lon
      updated
      polygon
    }
  }
`

export default getAllScanCells
