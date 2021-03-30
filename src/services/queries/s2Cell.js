import { gql } from '@apollo/client'

const getAllS2Cells = gql`
  query Data($minLat: Float!, $minLon: Float!, $maxLat: Float!, $maxLon: Float!) {
    s2Cells(minLat: $minLat, minLon: $minLon, maxLat: $maxLat, maxLon: $maxLon) {
      id
      center_lat
      center_lon
      updated
    }
  }
`

export default getAllS2Cells
