import { gql } from '@apollo/client'

const getAllPokestops = gql`
  query Data($minLat: Float!, $minLon: Float!, $maxLat: Float!, $maxLon: Float!, $filters: JSON! ) {
    pokestops(minLat: $minLat, minLon: $minLon, maxLat: $maxLat, maxLon: $maxLon, filters: $filters) {
      id
      lat
      lon
      quest_rewards
      quest_pokemon_id
      lure_id
      lure_expire_timestamp
      incident_expire_timestamp
      grunt_type
    }
  }
`

export default getAllPokestops
