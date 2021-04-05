import { gql } from '@apollo/client'

const getAllWeather = gql`
query Data {
  weather {
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
