import { gql } from '@apollo/client'

export const GET_ALL_SUBMISSION_CELLS = gql`
  query SubmissionCells(
    $minLat: Float!
    $minLon: Float!
    $maxLat: Float!
    $maxLon: Float!
    $zoom: Int!
    $filters: JSON
  ) {
    submissionCells(
      minLat: $minLat
      minLon: $minLon
      maxLat: $maxLat
      maxLon: $maxLon
      zoom: $zoom
      filters: $filters
    ) {
      level17Cells {
        id
        polygon
        blocked
      }
      level14Cells {
        id
        count_pokestops
        count_gyms
        polygon
      }
      pois {
        id
        lat
        lon
        showcase
        partner
      }
    }
  }
`
