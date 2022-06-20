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

export const getPokemon = gql`
  ${core}
  query Pokemon(
    $minLat: Float!
    $minLon: Float!
    $maxLat: Float!
    $maxLon: Float!
    $filters: JSON!
    $ts: Int
  ) {
    pokemon(
      minLat: $minLat
      minLon: $minLon
      maxLat: $maxLat
      maxLon: $maxLon
      filters: $filters
      ts: $ts
    ) {
      ...CorePokemon
    }
  }
`

export const getIvs = gql`
  ${core}
  ${ivs}
  query PokemonIVs(
    $minLat: Float!
    $minLon: Float!
    $maxLat: Float!
    $maxLon: Float!
    $filters: JSON!
    $ts: Int
  ) {
    pokemon(
      minLat: $minLat
      minLon: $minLon
      maxLat: $maxLat
      maxLon: $maxLon
      filters: $filters
      ts: $ts
    ) {
      ...CorePokemon
      ...Iv
    }
  }
`

export const getPvp = gql`
  ${core}
  ${pvp}
  query PokemonPVP(
    $minLat: Float!
    $minLon: Float!
    $maxLat: Float!
    $maxLon: Float!
    $filters: JSON!
    $ts: Int
    $version: String
  ) {
    pokemon(
      minLat: $minLat
      minLon: $minLon
      maxLat: $maxLat
      maxLon: $maxLon
      filters: $filters
      ts: $ts
      version: $version
    ) {
      ...CorePokemon
      ...Pvp
    }
  }
`

export const getIvsPvp = gql`
  ${core}
  ${ivs}
  ${pvp}
  query PokemonIVsPVP(
    $minLat: Float!
    $minLon: Float!
    $maxLat: Float!
    $maxLon: Float!
    $filters: JSON!
    $ts: Int
    $version: String
  ) {
    pokemon(
      minLat: $minLat
      minLon: $minLon
      maxLat: $maxLat
      maxLon: $maxLon
      filters: $filters
      ts: $ts
      version: $version
    ) {
      ...CorePokemon
      ...Iv
      ...Pvp
    }
  }
`

export const getOne = gql`
  query GetOnePokemon($id: ID!, $perm: String!, $version: String) {
    pokemonSingle(id: $id, perm: $perm, version: $version) {
      lat
      lon
    }
  }
`
