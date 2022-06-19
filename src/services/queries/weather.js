import { gql } from '@apollo/client'

const getAllWeather = gql`
  query Weather($version: String) {
    weather(version: $version) {
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
