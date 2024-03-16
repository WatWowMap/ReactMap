import { gql } from '@apollo/client'

export const CUSTOM_COMPONENT = gql`
  query CustomComponent($component: String) {
    customComponent(component: $component)
  }
`

export const MOTD_CHECK = gql`
  query MotdCheck($clientIndex: Int) {
    motdCheck(clientIndex: $clientIndex)
  }
`

export const FAB_BUTTONS = gql`
  query FabButtons {
    fabButtons {
      custom {
        color
        href
        icon
        target
      }
      donationButton
      profileButton
      scanNext
      scanZone
      webhooks
      search
    }
  }
`

export const SEARCHABLE = gql`
  query Searchable {
    searchable
  }
`

export const VALIDATE_USER = gql`
  query ValidateUser {
    validateUser {
      admin
      loggedIn
    }
  }
`

export const SAVE_COMPONENT = gql`
  mutation SaveComponent($component: String, $code: String) {
    saveComponent(component: $component, code: $code)
  }
`

export const LOCALES_STATUS = gql`
  query Locales($locale: String!) {
    locales(locale: $locale) {
      human
      ai
      missing
    }
  }
`
