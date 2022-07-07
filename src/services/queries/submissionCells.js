import { gql } from '@apollo/client'

const getAllSubmissionCells = gql`
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
      placementCells {
        cells {
          id
          level
          polygon
          blocked
        }
        rings {
          id
          lat
          lon
        }
      }
      typeCells {
        id
        level
        count
        count_pokestops
        count_gyms
        polygon
      }
    }
  }
`

export default getAllSubmissionCells
