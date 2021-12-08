import { gql } from '@apollo/client'

export default gql`
mutation Data($tutorial: Boolean!) {
    user(tutorial: $tutorial)
  }
`
