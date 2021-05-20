import { gql } from '@apollo/client'

const getAllSpawnpoints = gql`
query Data($minLat: Float!, $minLon: Float!, $maxLat: Float!, $maxLon: Float!) {
  spawnpoints(minLat: $minLat, minLon: $minLon, maxLat: $maxLat, maxLon: $maxLon) {
    id
    lat
    lon
    despawn_sec
    updated
  }
}
`

export default getAllSpawnpoints
