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

export const setExtraFields = gql`
  mutation SetExtraFields($key: String, $value: String) {
    setExtraFields(key: $key, value: $value)
  }
`

export const getBackups = gql`
  query GetBackups {
    backups {
      id
      name
      createdAt
      updatedAt
    }
  }
`

export const getFullBackup = gql`
  query GetFullBackup($id: ID!) {
    backup(id: $id) {
      data
    }
  }
`

export const createBackup = gql`
  mutation CreateBackup($backup: BackupCreate!) {
    createBackup(backup: $backup)
  }
`

export const updateBackup = gql`
  mutation UpdateBackup($backup: BackupUpdate!) {
    updateBackup(backup: $backup)
  }
`

export const deleteBackup = gql`
  mutation DeleteBackup($id: ID!) {
    deleteBackup(id: $id)
  }
`
