import { gql } from '@apollo/client'

export default gql`
  query Geocoder($search: String!, $name: String!) {
    geocoder(search: $search, name: $name) {
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
