import { gql } from '@apollo/client'

export default gql`
  mutation Webhook($data: JSON!, $category: String!, $exists: Boolean!) {
    webhook(data: $data, category: $category, exists: $exists) {
      status
      category
      method
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
