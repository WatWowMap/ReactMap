import { gql } from '@apollo/client'

const getAllNests = gql`
  query Data($minLat: Float!, $minLon: Float!, $maxLat: Float!, $maxLon: Float!, $filters: JSON!) {
    nests(minLat: $minLat, minLon: $minLon, maxLat: $maxLat, maxLon: $maxLon, filters: $filters) {
    nest_id
    lat
    lon
    name
    pokemon_id
    pokemon_form
    updated
    pokemon_avg
    polygon_path
  }
}
`

export default getAllNests
