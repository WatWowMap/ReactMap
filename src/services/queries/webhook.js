import { gql } from '@apollo/client'

export default gql`
  mutation Webhook($dataObj: JSON!, $category: String!) {
    webhook(dataObj: $dataObj, category: $category) {
      status
    }
  }
`
