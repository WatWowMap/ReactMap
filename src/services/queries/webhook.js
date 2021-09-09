import { gql } from '@apollo/client'

export default gql`
  mutation Webhook($data: JSON!, $category: String!, $status: String!) {
    webhook(data: $data, category: $category, status: $status) {
      status
      message
      category
      gym {
        uid
        clean
        distance
        team
        slot_changes
        gym_id
        allRaids
      }
      egg {
        uid
        clean
        distance
        level
        team
        gym_id
      }
      raid {
        uid
        clean
        distance
        level
        pokemon_id
        form
        team
        gym_id
      }
    }
  }
`
