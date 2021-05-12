import { gql } from '@apollo/client'

const core = gql`
  fragment CoreGym on Gym {
    id
    name
    url
    lat
    lon
    updated
    last_modified_timestamp
  }
`

const gym = gql`
  fragment Gym on Gym {
    availble_slots
    ex_raid_eligible
    ar_scan_eligible
    team_id
    in_battle
    guarding_pokemon_id
    total_cp
  }
`

const raid = gql`
  fragment Raid on Gym {
    raid_level
    raid_battle_timestamp
    raid_end_timestamp
    raid_pokemon_id
    raid_pokemon_form
    raid_pokemon_gender
    raid_pokemon_costume
    raid_pokemon_evolution
    raid_pokemon_move_1
    raid_pokemon_move_2
  }
`

export const getGyms = gql`
  ${core}
  ${gym}
  query Data($minLat: Float!, $minLon: Float!, $maxLat: Float!, $maxLon: Float!, $filters: JSON!) {
    gyms(minLat: $minLat, minLon: $minLon, maxLat: $maxLat, maxLon: $maxLon, filters: $filters) {
      ...CoreGym
      ...Gym
    }
  }
`

export const getRaids = gql`
  ${core}
  ${raid}
  query Data($minLat: Float!, $minLon: Float!, $maxLat: Float!, $maxLon: Float!, $filters: JSON!) {
    gyms(minLat: $minLat, minLon: $minLon, maxLat: $maxLat, maxLon: $maxLon, filters: $filters) {
      ...CoreGym
      ...Raid
    }
  }
`

export const getGymsRaids = gql`
  ${core}
  ${gym}
  ${raid}
  query Data($minLat: Float!, $minLon: Float!, $maxLat: Float!, $maxLon: Float!, $filters: JSON!) {
    gyms(minLat: $minLat, minLon: $minLon, maxLat: $maxLat, maxLon: $maxLon, filters: $filters) {
      ...CoreGym
      ...Gym
      ...Raid
    }
  }
`
