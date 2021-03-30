import { gql } from '@apollo/client'

const getAllGyms = gql`
  query Data($minLat: Float!, $minLon: Float!, $maxLat: Float!, $maxLon: Float!) {
    gyms(minLat: $minLat, minLon: $minLon, maxLat: $maxLat, maxLon: $maxLon) {
      id
      lat
      lon
      availble_slots
      team_id
      in_battle
    }
  }
`

const getAllRaids = gql`
  query Data($minLat: Float!, $minLon: Float!, $maxLat: Float!, $maxLon: Float!) {
    gyms(minLat: $minLat, minLon: $minLon, maxLat: $maxLat, maxLon: $maxLon) {
      id
      lat
      lon
      raid_level
      raid_battle_timestamp
      raid_end_timestamp
      raid_pokemon_id
      raid_pokemon_form
      raid_pokemon_gender
      raid_pokemon_costume
      raid_pokemon_evolution
      availble_slots
      team_id
      in_battle
    }
  }
`

export { getAllGyms, getAllRaids }
