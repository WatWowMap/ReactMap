import { gql } from '@apollo/client'

const getAllPokemon = gql`
  query Data($minLat: Float!, $minLon: Float!, $maxLat: Float!, $maxLon: Float!) {
    pokemon(minLat: $minLat, minLon: $minLon, maxLat: $maxLat, maxLon: $maxLon) {
      id
      lat
      lon
      pokemon_id
    }
  }
`

export { getAllPokemon }