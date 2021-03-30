import { gql } from '@apollo/client'

const getAllSubmissionCells = gql`
  query Data($minLat: Float!, $minLon: Float!, $maxLat: Float!, $maxLon: Float!) {
    gyms(minLat: $minLat, minLon: $minLon, maxLat: $maxLat, maxLon: $maxLon) {
      lat
      lon
      sponsor_id
    },
    pokestops(minLat: $minLat, minLon: $minLon, maxLat: $maxLat, maxLon: $maxLon) {
      lat
      lon
      sponsor_id
    }
  }
`

export default getAllSubmissionCells
