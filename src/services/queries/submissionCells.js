import { gql } from '@apollo/client'

const getAllSubmissionCells = gql`
  query Data($minLat: Float!, $minLon: Float!, $maxLat: Float!, $maxLon: Float!, $zoom: Int!) {
    submissionCells(minLat: $minLat, minLon: $minLon, maxLat: $maxLat, maxLon: $maxLon, zoom: $zoom) {
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
