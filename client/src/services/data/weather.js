import { gql } from '@apollo/client'

const getAllWeather = gql`
{
  weather {
    id
    latitude
    longitude
    updated
  }
}
`

export { getAllWeather }