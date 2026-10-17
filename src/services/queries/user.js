// @ts-check

import { gql } from '@apollo/client'

export const SET_TUTORIAL = gql`
  mutation SetTutorial($tutorial: Boolean!) {
    tutorial(tutorial: $tutorial)
  }
`

export const SET_WEBHOOK_STRATEGY = gql`
  mutation SetStrategy($strategy: String!) {
    strategy(strategy: $strategy)
  }
`

export const CHECK_USERNAME = gql`
  query CheckUsername($username: String!) {
    checkUsername(username: $username)
  }
`

export const SET_GYM_BADGE = gql`
  mutation SetGymBadge($gymId: String!, $badge: Int!) {
    setGymBadge(gymId: $gymId, badge: $badge)
  }
`

export const SET_PERSONAL_SHINY = gql`
  mutation SetPersonalShiny($players: JSON) {
    setPersonalShiny(players: $players)
  }
`

export const SET_EXTRA_FIELDS = gql`
  mutation SetExtraFields($key: String, $value: String) {
    setExtraFields(key: $key, value: $value)
  }
`

export const GET_BACKUPS = gql`
  query GetBackups {
    backups {
      id
      name
      createdAt
      updatedAt
    }
  }
`

export const GET_FULL_BACKUP = gql`
  query GetFullBackup($id: ID!) {
    backup(id: $id) {
      name
      data
    }
  }
`

export const CREATE_BACKUP = gql`
  mutation CreateBackup($backup: BackupCreate!) {
    createBackup(backup: $backup)
  }
`

export const UPDATE_BACKUP = gql`
  mutation UpdateBackup($backup: BackupUpdate!) {
    updateBackup(backup: $backup)
  }
`

export const GET_SETTINGS_SYNC = gql`
  query GetSettingsSync($withData: Boolean) {
    settingsSync(withData: $withData) {
      rev
      data
    }
  }
`

export const SET_SETTINGS_SYNC = gql`
  mutation SetSettingsSync($data: JSON, $baseRev: Float) {
    setSettingsSync(data: $data, baseRev: $baseRev) {
      rev
      conflict
    }
  }
`

export const DELETE_BACKUP = gql`
  mutation DeleteBackup($id: ID!) {
    deleteBackup(id: $id)
  }
`
