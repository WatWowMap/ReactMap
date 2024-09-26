// @ts-check

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
    guarding_pokemon_display
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
    raid_pokemon_alignment
  }
`

export const GET_GYMS = gql`
  ${core}
  ${gym}
  query Gyms(
    $minLat: Float!
    $minLon: Float!
    $maxLat: Float!
    $maxLon: Float!
    $filters: JSON!
  ) {
    gyms(
      minLat: $minLat
      minLon: $minLon
      maxLat: $maxLat
      maxLon: $maxLon
      filters: $filters
    ) {
      ...CoreGym
      ...Gym
    }
  }
`

export const GET_RAIDS = gql`
  ${core}
  ${raid}
  query Raids(
    $minLat: Float!
    $minLon: Float!
    $maxLat: Float!
    $maxLon: Float!
    $filters: JSON!
  ) {
    gyms(
      minLat: $minLat
      minLon: $minLon
      maxLat: $maxLat
      maxLon: $maxLon
      filters: $filters
    ) {
      ...CoreGym
      ...Raid
    }
  }
`

export const GET_GYMS_RAIDS = gql`
  ${core}
  ${gym}
  ${raid}
  query GymsRaids(
    $minLat: Float!
    $minLon: Float!
    $maxLat: Float!
    $maxLon: Float!
    $filters: JSON!
  ) {
    gyms(
      minLat: $minLat
      minLon: $minLon
      maxLat: $maxLat
      maxLon: $maxLon
      filters: $filters
    ) {
      ...CoreGym
      ...Gym
      ...Raid
    }
  }
`

export const GET_ONE_GYM = gql`
  query GetOneGym($id: ID!, $perm: String!) {
    gymsSingle(id: $id, perm: $perm) {
      lat
      lon
    }
  }
`

export const GET_BADGES = gql`
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
