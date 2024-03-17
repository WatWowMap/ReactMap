import { gql } from '@apollo/client'

export const GET_ALL_SPAWNPOINTS = gql`
  query Spawnpoints(
    $minLat: Float!
    $minLon: Float!
    $maxLat: Float!
    $maxLon: Float!
    $filters: JSON
  ) {
    spawnpoints(
      minLat: $minLat
      minLon: $minLon
      maxLat: $maxLat
      maxLon: $maxLon
      filters: $filters
    ) {
      id
      lat
      lon
      despawn_sec
      updated
    }
  }
`
