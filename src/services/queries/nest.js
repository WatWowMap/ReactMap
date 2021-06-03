import { gql } from '@apollo/client'

const core = gql`
  fragment CoreNest on Nest {
    nest_id
    lat
    lon
  }
`

export const getAllNests = gql`
  ${core}
  query Data($minLat: Float!, $minLon: Float!, $maxLat: Float!, $maxLon: Float!, $filters: JSON!) {
    nests(minLat: $minLat, minLon: $minLon, maxLat: $maxLat, maxLon: $maxLon, filters: $filters) {
      ...CoreNest
      name
      pokemon_id
      pokemon_form
      updated
      pokemon_avg
      polygon_path
    }
  }
`

export const getOne = gql`
  ${core}
  query Data($id: ID!) {
    nestsSingle(id: $id) {
      ...CoreNest
    }
  }
`
