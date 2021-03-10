import { gql } from '@apollo/client'

const getDataQuery = gql`
  query Data($minLat: Float!, $minLon: Float!, $maxLat: Float!, $maxLon: Float!) {
    gyms(minLat: $minLat, minLon: $minLon, maxLat: $maxLat, maxLon: $maxLon) {
      id
      lat
      lon
      availble_slots
      team_id
      in_battle
    },
    pokestops(minLat: $minLat, minLon: $minLon, maxLat: $maxLat, maxLon: $maxLon) {
      id
      lat
      lon
    },
    pokemon(minLat: $minLat, minLon: $minLon, maxLat: $maxLat, maxLon: $maxLon) {
      id
      lat
      lon
      pokemon_id
    }
  }
`

export { getDataQuery }