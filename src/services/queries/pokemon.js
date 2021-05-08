import { gql } from '@apollo/client'

export default gql`
  query Data($minLat: Float!, $minLon: Float!, $maxLat: Float!, $maxLon: Float!, $filters: JSON!) {
    pokemon(minLat: $minLat, minLon: $minLon, maxLat: $maxLat, maxLon: $maxLon, filters: $filters) {
      id
      lat
      lon
      updated
      pokemon_id
      form
      gender
      iv
      cp
      move_1
      move_2
      level
      weight
      size
      atk_iv
      def_iv
      sta_iv
      weather
      first_seen_timestamp
      expire_timestamp
      expire_timestamp_verified
      great
      ultra
    }
  }
`
