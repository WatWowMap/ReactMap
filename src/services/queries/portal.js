import { gql } from '@apollo/client'

export const getAllPortals = gql`
  query Portals(
    $minLat: Float!
    $minLon: Float!
    $maxLat: Float!
    $maxLon: Float!
  ) {
    portals(
      minLat: $minLat
      minLon: $minLon
      maxLat: $maxLat
      maxLon: $maxLon
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

export const getOne = gql`
  query GetOnePortal($id: ID!, $perm: String!) {
    portalsSingle(id: $id, perm: $perm) {
      lat
      lon
    }
  }
`
