import { gql } from '@apollo/client'

export const getAllWeather = gql`
  query Weather(
    $minLat: Float!
    $minLon: Float!
    $maxLat: Float!
    $maxLon: Float!
    $filters: JSON
  ) {
    weather(
      minLat: $minLat
      minLon: $minLon
      maxLat: $maxLat
      maxLon: $maxLon
      filters: $filters
    ) {
      id
      latitude
      longitude
      gameplay_condition
      updated
      polygon
    }
  }
`
