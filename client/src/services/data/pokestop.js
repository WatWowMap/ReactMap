import { gql } from '@apollo/client'

const getAllPokestops = gql`
  query Data($minLat: Float!, $minLon: Float!, $maxLat: Float!, $maxLon: Float!) {
    pokestops(minLat: $minLat, minLon: $minLon, maxLat: $maxLat, maxLon: $maxLon) {
      id
      lat
      lon
    }
  }
`

export { getAllPokestops }