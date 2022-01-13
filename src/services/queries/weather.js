import { gql } from '@apollo/client'

const getAllWeather = gql`
query Weather {
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
