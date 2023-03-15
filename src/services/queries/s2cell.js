import { gql } from '@apollo/client'

export default gql`
  query S2Cells(
    $minLat: Float!
    $minLon: Float!
    $maxLat: Float!
    $maxLon: Float!
    $filters: JSON
  ) {
    s2cells(
      minLat: $minLat
      minLon: $minLon
      maxLat: $maxLat
      maxLon: $maxLon
      filters: $filters
    ) {
      id
      coords
    }
  }
`
