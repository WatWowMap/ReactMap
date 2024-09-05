// @ts-check

import { gql } from '@apollo/client'

const core = gql`
  fragment CoreStation on Station {
    id
    name
    lat
    lon
    updated
    start_time
    end_time
  }
`

const battle = gql`
  fragment Battle on Station {
    is_inactive
    is_battle_available
    battle_level
    battle_pokemon_id
    battle_pokemon_form
    battle_pokemon_costume
    battle_pokemon_gender
    battle_pokemon_alignment
  }
`

export const GET_ALL_STATIONS = gql`
  ${core}
  query Stations(
    $minLat: Float!
    $minLon: Float!
    $maxLat: Float!
    $maxLon: Float!
    $filters: JSON!
  ) {
    stations(
      minLat: $minLat
      minLon: $minLon
      maxLat: $maxLat
      maxLon: $maxLon
      filters: $filters
    ) {
      ...CoreStation
    }
  }
`

export const GET_ALL_STATIONS_BATTLE = gql`
  ${core}
  ${battle}
  query Stations(
    $minLat: Float!
    $minLon: Float!
    $maxLat: Float!
    $maxLon: Float!
    $filters: JSON!
  ) {
    stations(
      minLat: $minLat
      minLon: $minLon
      maxLat: $maxLat
      maxLon: $maxLon
      filters: $filters
    ) {
      ...CoreStation
      ...Battle
    }
  }
`
