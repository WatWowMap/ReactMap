import { gql } from '@apollo/client'

export const setTutorial = gql`
mutation SetTutorial($tutorial: Boolean!) {
    tutorial(tutorial: $tutorial)
  }
`

export const setWebhookStrategy = gql`
mutation SetStrategy($strategy: String!) {
    strategy(strategy: $strategy)
  }
`

export const checkUsername = gql`
mutation SetUsername($username: String!) {
    checkUsername(username: $username)
  }
`

export const setGymBadge = gql`
mutation SetGymBadge($gymId: String!, $badge: Int!) {
    setGymBadge(gymId: $gymId, badge: $badge)
  }
`
