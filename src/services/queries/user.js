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
