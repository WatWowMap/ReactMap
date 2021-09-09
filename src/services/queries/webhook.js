import { gql } from '@apollo/client'

export default gql`
  mutation Webhook($data: JSON!, $category: String!, $status: String!) {
    webhook(data: $data, category: $category, status: $status) {
      status
      message
      gym {
        uid
        clean
        distance
        template
        team
        slot_changes
        gym_id
      }
    }
  }
`
