import { gql } from '@apollo/client'

const scanner = gql`
  query Scanner($category: String!, $method: String!, $data: JSON!) {
    scanner(category: $category, method: $method, data: $data) {
      status
      message
    }
  }
`

export default scanner
