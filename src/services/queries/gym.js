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
    available_slots
    ex_raid_eligible
    ar_scan_eligible
    team_id
    in_battle
    guarding_pokemon_id
    total_cp
    badge
    power_up_level
    power_up_points
    power_up_end_timestamp
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
  query Gyms(
    $minLat: Float!
    $minLon: Float!
    $maxLat: Float!
    $maxLon: Float!
    $filters: JSON!
    $ts: Int!
  ) {
    gyms(
      minLat: $minLat
      minLon: $minLon
      maxLat: $maxLat
      maxLon: $maxLon
      filters: $filters
      ts: $ts
    ) {
      ...CoreGym
      ...Gym
    }
  }
`

export const getRaids = gql`
  ${core}
  ${raid}
  query Raids(
    $minLat: Float!
    $minLon: Float!
    $maxLat: Float!
    $maxLon: Float!
    $filters: JSON!
    $ts: Int!
  ) {
    gyms(
      minLat: $minLat
      minLon: $minLon
      maxLat: $maxLat
      maxLon: $maxLon
      filters: $filters
      ts: $ts
    ) {
      ...CoreGym
      ...Raid
    }
  }
`

export const getGymsRaids = gql`
  ${core}
  ${gym}
  ${raid}
  query GymsRaids(
    $minLat: Float!
    $minLon: Float!
    $maxLat: Float!
    $maxLon: Float!
    $filters: JSON!
    $ts: Int!
  ) {
    gyms(
      minLat: $minLat
      minLon: $minLon
      maxLat: $maxLat
      maxLon: $maxLon
      filters: $filters
      ts: $ts
    ) {
      ...CoreGym
      ...Gym
      ...Raid
    }
  }
`

export const getOne = gql`
  query GetOneGym($id: ID!, $perm: String!) {
    gymsSingle(id: $id, perm: $perm) {
      lat
      lon
    }
  }
`

export const getBadges = gql`
  query GetBadgeInfo {
    badges {
      id
      name
      url
      lat
      lon
      badge
      deleted
    }
  }
`
