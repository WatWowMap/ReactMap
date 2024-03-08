import { gql } from '@apollo/client'

const core = gql`
  fragment CorePokemon on Pokemon {
    id
    lat
    lon
    pokemon_id
    form
    gender
    costume
    first_seen_timestamp
    expire_timestamp
    expire_timestamp_verified
    updated
    display_pokemon_id
    ditto_form
    seen_type
  }
`

const ivs = gql`
  fragment Iv on Pokemon {
    iv
    cp
    level
    atk_iv
    def_iv
    sta_iv
    weight
    size
    height
    move_1
    move_2
    weather
  }
`

const pvp = gql`
  fragment Pvp on Pokemon {
    cleanPvp
    bestPvp
  }
`

export const GET_POKEMON = gql`
  ${core}
  query Pokemon(
    $minLat: Float!
    $minLon: Float!
    $maxLat: Float!
    $maxLon: Float!
    $filters: JSON!
  ) {
    pokemon(
      minLat: $minLat
      minLon: $minLon
      maxLat: $maxLat
      maxLon: $maxLon
      filters: $filters
    ) {
      ...CorePokemon
    }
  }
`

export const GET_IVS = gql`
  ${core}
  ${ivs}
  query PokemonIVs(
    $minLat: Float!
    $minLon: Float!
    $maxLat: Float!
    $maxLon: Float!
    $filters: JSON!
  ) {
    pokemon(
      minLat: $minLat
      minLon: $minLon
      maxLat: $maxLat
      maxLon: $maxLon
      filters: $filters
    ) {
      ...CorePokemon
      ...Iv
    }
  }
`

export const GET_PVP = gql`
  ${core}
  ${pvp}
  query PokemonPVP(
    $minLat: Float!
    $minLon: Float!
    $maxLat: Float!
    $maxLon: Float!
    $filters: JSON!
  ) {
    pokemon(
      minLat: $minLat
      minLon: $minLon
      maxLat: $maxLat
      maxLon: $maxLon
      filters: $filters
    ) {
      ...CorePokemon
      ...Pvp
    }
  }
`

export const GET_IVS_PVP = gql`
  ${core}
  ${ivs}
  ${pvp}
  query PokemonIVsPVP(
    $minLat: Float!
    $minLon: Float!
    $maxLat: Float!
    $maxLon: Float!
    $filters: JSON!
  ) {
    pokemon(
      minLat: $minLat
      minLon: $minLon
      maxLat: $maxLat
      maxLon: $maxLon
      filters: $filters
    ) {
      ...CorePokemon
      ...Iv
      ...Pvp
    }
  }
`

export const GET_ONE_POKEMON = gql`
  query GetOnePokemon($id: ID!, $perm: String!) {
    pokemonSingle(id: $id, perm: $perm) {
      lat
      lon
    }
  }
`
