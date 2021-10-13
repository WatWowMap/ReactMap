import { gql } from '@apollo/client'

const getAllS2cells = gql`
  query Data($minLat: Float!, $minLon: Float!, $maxLat: Float!, $maxLon: Float!, $zoom: Int!) {
    s2cells(minLat: $minLat, minLon: $minLon, maxLat: $maxLat, maxLon: $maxLon, zoom: $zoom) {
      id
      center_lat
      center_lon
      updated
      polygon
    }
  }
`

export default getAllS2cells
