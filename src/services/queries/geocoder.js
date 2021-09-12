import { gql } from '@apollo/client'

export default gql`
  query Geocoder($search: String!) {
    geocoder(search: $search) {
      latitude
      longitude
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
  }
`
