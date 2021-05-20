import { gql } from '@apollo/client'

const getAllPortals = gql`
  query Data($minLat: Float!, $minLon: Float!, $maxLat: Float!, $maxLon: Float!) {
    portals(minLat: $minLat, minLon: $minLon, maxLat: $maxLat, maxLon: $maxLon) {
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

export default getAllPortals
