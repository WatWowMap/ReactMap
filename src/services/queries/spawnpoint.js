import { gql } from '@apollo/client'

const getAllSpawnpoints = gql`
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

export default getAllSpawnpoints
