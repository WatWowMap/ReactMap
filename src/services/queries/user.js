import { gql } from '@apollo/client'

export const setTutorial = gql`
mutation Data($tutorial: Boolean!) {
    tutorial(tutorial: $tutorial)
  }
`

export const setWebhookStrategy = gql`
mutation Data($strategy: String!) {
    strategy(strategy: $strategy)
  }
`

export const checkUsername = gql`
mutation Data($username: String!) {
    checkUsername(username: $username)
  }
`
