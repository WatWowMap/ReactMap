import { gql } from '@apollo/client'

const getAllWeather = gql`
  query Weather($version: String, $filters: JSON) {
    weather(version: $version, filters: $filters) {
      id
      latitude
      longitude
      gameplay_condition
      updated
      polygon
    }
  }
`

export default getAllWeather
