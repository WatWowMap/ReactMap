import { gql } from '@apollo/client'

export const getAllPortals = gql`
  query Portals($minLat: Float!, $minLon: Float!, $maxLat: Float!, $maxLon: Float!, $version: String) {
    portals(minLat: $minLat, minLon: $minLon, maxLat: $maxLat, maxLon: $maxLon, version: $version) {
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
  query GetOnePortal($id: ID!, $perm: String!, $version: String) {
    portalsSingle(id: $id, perm: $perm, version: $version) {
      lat
      lon
    }
  }
`
