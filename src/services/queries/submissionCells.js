import { gql } from '@apollo/client'

const getAllSubmissionCells = gql`
  query Data($minLat: Float!, $minLon: Float!, $maxLat: Float!, $maxLon: Float!, $zoom: Int!) {
    submissionCells(minLat: $minLat, minLon: $minLon, maxLat: $maxLat, maxLon: $maxLon, zoom: $zoom)
  }
`

export default getAllSubmissionCells
