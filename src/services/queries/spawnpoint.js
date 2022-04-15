import { gql } from '@apollo/client'

const getAllSpawnpoints = gql`
query Spawnpoints($minLat: Float!, $minLon: Float!, $maxLat: Float!, $maxLon: Float!, $version: String!) {
  spawnpoints(minLat: $minLat, minLon: $minLon, maxLat: $maxLat, maxLon: $maxLon, version: $version) {
    id
    lat
    lon
    despawn_sec
    updated
  }
}
`

export default getAllSpawnpoints
