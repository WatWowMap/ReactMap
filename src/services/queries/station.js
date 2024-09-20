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
    total_stationed_pokemon
  }
`

const battle = gql`
  fragment Battle on Station {
    is_inactive
    is_battle_available
    battle_level
    battle_start
    battle_end
    battle_pokemon_id
    battle_pokemon_form
    battle_pokemon_costume
    battle_pokemon_gender
    battle_pokemon_alignment
    battle_pokemon_bread_mode
    battle_pokemon_move_1
    battle_pokemon_move_2
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

export const GET_STATION_POKEMON = gql`
  query StationPokemon($id: ID!) {
    stationPokemon(id: $id) {
      pokemon_id
      form
      costume
      gender
      bread_mode
    }
  }
`
