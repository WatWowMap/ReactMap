import { gql } from '@apollo/client'

export const GET_ALL_PORTALS = gql`
  query Portals(
    $minLat: Float!
    $minLon: Float!
    $maxLat: Float!
    $maxLon: Float!
    $filters: JSON
  ) {
    portals(
      minLat: $minLat
      minLon: $minLon
      maxLat: $maxLat
      maxLon: $maxLon
      filters: $filters
    ) {
      id
      lat
      lon
      name
      url
      updated
      imported
    }
  }
`

export const GET_ONE_PORTAL = gql`
  query GetOnePortal($id: ID!, $perm: String!) {
    portalsSingle(id: $id, perm: $perm) {
      lat
      lon
    }
  }
`
