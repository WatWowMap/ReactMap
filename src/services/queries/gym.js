import { gql } from '@apollo/client'

const core = gql`
  fragment CoreGym on Gym {
    id
    name
    lat
    lon
    updated
  }
`

const gym = gql`
  fragment Gym on Gym {
    availble_slots
    ex_raid_eligible
    team_id
    in_battle
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
