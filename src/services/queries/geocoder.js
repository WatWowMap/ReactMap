import { gql } from '@apollo/client'

export const NOMINATIM = gql`
  fragment Nominatim on Geocoder {
    latitude
    longitude
    formatted
    streetNumber
    streetName
    neighborhood
    suburb
    city
    state
    zipcode
    country
    countryCode
  }
`

export const WEBHOOK_NOMINATIM = gql`
  query Geocoder($search: String!) {
    geocoder(search: $search) {
      latitude
      longitude
      formatted
    }
  }
`
