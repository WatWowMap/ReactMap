// @ts-check
import { gql } from '@apollo/client'

export const GET_ALL_TAPPABLES = gql`
  query GetTappables(
    $minLat: Float!
    $maxLat: Float!
    $minLon: Float!
    $maxLon: Float!
    $filters: JSON
  ) {
    tappables(
      minLat: $minLat
      maxLat: $maxLat
      minLon: $minLon
      maxLon: $maxLon
      filters: $filters
    ) {
      id
      lat
      lon
      type
      item_id
      count
      expire_timestamp
      expire_timestamp_verified
      updated
    }
  }
`
