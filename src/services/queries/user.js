import { gql } from '@apollo/client'

const user = gql`
mutation Data($tutorial: Boolean!) {
    user(tutorial: $tutorial)
  }
`

export default user
