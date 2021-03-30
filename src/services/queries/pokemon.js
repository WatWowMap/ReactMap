import { gql } from '@apollo/client'

const getAllPokemon = gql`
  query Data($minLat: Float!, $minLon: Float!, $maxLat: Float!, $maxLon: Float!, $filters: JSON! ) {
    pokemon(minLat: $minLat, minLon: $minLon, maxLat: $maxLat, maxLon: $maxLon, filters: $filters) {
      id
      lat
      lon
      pokemon_id
      form
    }
  }
`
export default getAllPokemon
