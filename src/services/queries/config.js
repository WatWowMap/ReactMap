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
