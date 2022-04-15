import { gql } from '@apollo/client'

export const Nominatim = gql`
  fragment Nominatim on Geocoder {
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
`

export default gql`
  ${Nominatim}
  query Geocoder($search: String!, $name: String!, $version: String!) {
    geocoder(search: $search, name: $name, version: $version) {
      ...Nominatim
    }
  }
`
