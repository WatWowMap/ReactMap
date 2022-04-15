import { gql } from '@apollo/client'

const scanner = gql`
  query Scanner($category: String!, $method: String!, $data: JSON!, $version: String!) {
    scanner(category: $category, method: $method, data: $data, version: $version) {
      status
      message
    }
  }
`

export default scanner
