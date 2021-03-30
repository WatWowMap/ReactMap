import { gql } from '@apollo/client'

const getAllWeather = gql`
query Data($minLat: Float!, $minLon: Float!, $maxLat: Float!, $maxLon: Float!) {
  weather(minLat: $minLat, minLon: $minLon, maxLat: $maxLat, maxLon: $maxLon) {
    id
    latitude
    longitude
    gameplay_condition
    updated
  }
}
`

export default getAllWeather
