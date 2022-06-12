import { gql } from '@apollo/client'

const getAvailable = gql`
  query Available($version: String) {
    available(version: $version) {
      masterfile
      pokestops
      gyms
      pokemon
      nests
      filters
      questConditions
    }
  }
`

export default getAvailable
