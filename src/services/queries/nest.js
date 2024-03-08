import { gql } from '@apollo/client'

const core = gql`
  fragment CoreNest on Nest {
    id
    lat
    lon
  }
`

export const GET_ALL_NESTS = gql`
  ${core}
  query Nests(
    $minLat: Float!
    $minLon: Float!
    $maxLat: Float!
    $maxLon: Float!
    $filters: JSON!
  ) {
    nests(
      minLat: $minLat
      minLon: $minLon
      maxLat: $maxLat
      maxLon: $maxLon
      filters: $filters
    ) {
      ...CoreNest
      name
      pokemon_id
      pokemon_form
      updated
      pokemon_avg
      polygon_path
      submitted_by
    }
  }
`

export const GET_ONE_NEST = gql`
  ${core}
  query GetOneNest($id: ID!, $perm: String!) {
    nestsSingle(id: $id, perm: $perm) {
      ...CoreNest
    }
  }
`

export const NEST_SUBMISSION = gql`
  mutation NestSubmission($id: ID!, $name: String!) {
    nestSubmission(id: $id, name: $name)
  }
`
