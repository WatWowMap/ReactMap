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
    inactive_stats
  }
`

const ivs = gql`
  fragment Iv on Pokemon {
    iv
    cp
    level
    weight
    size
    move_1
    move_2
    weather
  }
`

const stats = gql`
  fragment Stats on Pokemon {
    cp
    level
    atk_iv
    def_iv
    sta_iv
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
  query Data($minLat: Float!, $minLon: Float!, $maxLat: Float!, $maxLon: Float!, $filters: JSON!, $ts: Int) {
    pokemon(minLat: $minLat, minLon: $minLon, maxLat: $maxLat, maxLon: $maxLon, filters: $filters, ts: $ts) {
      ...CorePokemon
    }
  }
`

export const getIvs = gql`
  ${core}
  ${ivs}
  query Data($minLat: Float!, $minLon: Float!, $maxLat: Float!, $maxLon: Float!, $filters: JSON!, $ts: Int) {
    pokemon(minLat: $minLat, minLon: $minLon, maxLat: $maxLat, maxLon: $maxLon, filters: $filters, ts: $ts) {
      ...CorePokemon
      ...Iv
    }
  }
`

export const getStats = gql`
  ${core}
  ${stats}
  query Data($minLat: Float!, $minLon: Float!, $maxLat: Float!, $maxLon: Float!, $filters: JSON!, $ts: Int) {
    pokemon(minLat: $minLat, minLon: $minLon, maxLat: $maxLat, maxLon: $maxLon, filters: $filters, ts: $ts) {
      ...CorePokemon
      ...Stats
    }
  }
`

export const getPvp = gql`
  ${core}
  ${pvp}
  query Data($minLat: Float!, $minLon: Float!, $maxLat: Float!, $maxLon: Float!, $filters: JSON!, $ts: Int) {
    pokemon(minLat: $minLat, minLon: $minLon, maxLat: $maxLat, maxLon: $maxLon, filters: $filters, ts: $ts) {
      ...CorePokemon
      ...Pvp
    }
  }
`

export const getIvsStats = gql`
  ${core}
  ${ivs}
  ${stats}
  query Data($minLat: Float!, $minLon: Float!, $maxLat: Float!, $maxLon: Float!, $filters: JSON!, $ts: Int) {
    pokemon(minLat: $minLat, minLon: $minLon, maxLat: $maxLat, maxLon: $maxLon, filters: $filters, ts: $ts) {
      ...CorePokemon
      ...Iv
      ...Stats
    }
  }
`

export const getIvsPvp = gql`
  ${core}
  ${ivs}
  ${pvp}
  query Data($minLat: Float!, $minLon: Float!, $maxLat: Float!, $maxLon: Float!, $filters: JSON!, $ts: Int) {
    pokemon(minLat: $minLat, minLon: $minLon, maxLat: $maxLat, maxLon: $maxLon, filters: $filters, ts: $ts) {
      ...CorePokemon
      ...Iv
      ...Pvp
    }
  }
`

export const getStatsPvp = gql`
  ${core}
  ${stats}
  ${pvp}
  query Data($minLat: Float!, $minLon: Float!, $maxLat: Float!, $maxLon: Float!, $filters: JSON!, $ts: Int) {
    pokemon(minLat: $minLat, minLon: $minLon, maxLat: $maxLat, maxLon: $maxLon, filters: $filters, ts: $ts) {
      ...CorePokemon
      ...Stats
      ...Pvp
    }
  }
`

export const getIvsStatsPvp = gql`
  ${core}
  ${ivs}
  ${stats}
  ${pvp}
  query Data($minLat: Float!, $minLon: Float!, $maxLat: Float!, $maxLon: Float!, $filters: JSON!, $ts: Int) {
    pokemon(minLat: $minLat, minLon: $minLon, maxLat: $maxLat, maxLon: $maxLon, filters: $filters, ts: $ts) {
      ...CorePokemon
      ...Iv
      ...Stats
      ...Pvp
    }
  }
`

export const getOne = gql`
  query Data($id: ID!, $perm: String!) {
    pokemonSingle(id: $id, perm: $perm) {
      lat
      lon
    }
  }
`
