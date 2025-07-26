// @ts-check
import { gql } from '@apollo/client'

export const GET_HYPERLOCAL = gql`
  query Hyperlocal(
    $minLat: Float!
    $maxLat: Float!
    $minLon: Float!
    $maxLon: Float!
    $filters: JSON!
  ) {
    hyperlocal(
      minLat: $minLat
      maxLat: $maxLat
      minLon: $minLon
      maxLon: $maxLon
      filters: $filters
    ) {
      experiment_id
      start_ms
      end_ms
      lat
      lon
      radius_m
      challenge_bonus_key
      updated_ms
    }
  }
`
