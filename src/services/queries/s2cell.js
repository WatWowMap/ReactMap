import { gql } from '@apollo/client'

const getAllS2cells = gql`
  query Data($minLat: Float!, $minLon: Float!, $maxLat: Float!, $maxLon: Float!) {
    s2cells(minLat: $minLat, minLon: $minLon, maxLat: $maxLat, maxLon: $maxLon) {
      id
      center_lat
      center_lon
      updated
      polygon
    }
  }
`

export default getAllS2cells
