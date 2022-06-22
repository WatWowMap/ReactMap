import { gql } from '@apollo/client'

const getAllWeather = gql`
  query Weather($filters: JSON) {
    weather(filters: $filters) {
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
