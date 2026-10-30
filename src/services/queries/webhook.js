// @ts-check

import { gql } from '@apollo/client'

const base = gql`
  fragment Base on Poracle {
    category
    message
    status
  }
`

const Egg = gql`
  fragment PoracleEgg on Poracle {
    egg
  }
`

const Human = gql`
  fragment PoracleHuman on Poracle {
    human {
      admin_disable
      area
      area_restrictions
      blocked_alerts
      community_membership
      current_profile_no
      disabled_date
      enabled
      fails
      id
      language
      last_checked
      latitude
      longitude
      name
      notes
      type
    }
  }
`

const Gym = gql`
  fragment PoracleGym on Poracle {
    gym
  }
`

const Invasion = gql`
  fragment PoracleInvasion on Poracle {
    invasion
  }
`

const Lure = gql`
  fragment PoracleLure on Poracle {
    lure
  }
`

const Nest = gql`
  fragment PoracleNest on Poracle {
    nest
  }
`

const Pokemon = gql`
  fragment PoraclePokemon on Poracle {
    pokemon
  }
`

export const PROFILE = gql`
  fragment PoracleProfile on Poracle {
    profile {
      active_hours {
        day
        hours
        mins
        step
        end_hours
        end_mins
        id
      }
      area
      id
      latitude
      longitude
      name
      profile_no
      uid
    }
  }
`

const Quest = gql`
  fragment PoracleQuest on Poracle {
    quest
  }
`

const Raid = gql`
  fragment PoracleRaid on Poracle {
    raid
  }
`

const Incident = gql`
  fragment PoracleIncident on Poracle {
    incident
  }
`

export const ALL_PROFILES = gql`
  ${Human}
  ${Egg}
  ${Gym}
  ${Incident}
  ${Invasion}
  ${Lure}
  ${Nest}
  ${Pokemon}
  ${PROFILE}
  ${Quest}
  ${Raid}
  query Webhook($category: String!, $status: String!) {
    webhook(category: $category, status: $status) {
      ...PoracleHuman
      ...PoracleEgg
      ...PoracleGym
      ...PoracleIncident
      ...PoracleInvasion
      ...PoracleLure
      ...PoracleNest
      ...PoraclePokemon
      ...PoracleProfile
      ...PoracleQuest
      ...PoracleRaid
    }
  }
`

export const WEBHOOK_AREAS = gql`
  query WebhookAreas {
    webhookAreas {
      group
      children
    }
  }
`

export const QUICK_ADD = gql`
  ${Human}
  ${Egg}
  ${Gym}
  ${Incident}
  ${Invasion}
  ${Lure}
  ${Nest}
  ${Pokemon}
  ${PROFILE}
  ${Quest}
  ${Raid}
  mutation Webhook($data: JSON, $category: String!, $status: String!) {
    webhook(data: $data, category: $category, status: $status) {
      ...PoracleHuman
      ...PoracleEgg
      ...PoracleGym
      ...PoracleIncident
      ...PoracleInvasion
      ...PoracleLure
      ...PoracleNest
      ...PoraclePokemon
      ...PoracleProfile
      ...PoracleQuest
      ...PoracleRaid
      status
      message
    }
  }
`

export const SET_HUMAN = gql`
  ${base}
  ${Human}
  mutation Webhook($data: JSON, $category: String!, $status: String!) {
    webhook(data: $data, category: $category, status: $status) {
      ...Base
      ...PoracleHuman
    }
  }
`

export const SET_PROFILE = gql`
  ${base}
  ${PROFILE}
  mutation Webhook($data: JSON, $category: String!, $status: String!) {
    webhook(data: $data, category: $category, status: $status) {
      ...Base
      ...PoracleProfile
    }
  }
`

export const POKEMON = gql`
  ${base}
  ${Pokemon}
  mutation Webhook($data: JSON, $category: String!, $status: String!) {
    webhook(data: $data, category: $category, status: $status) {
      ...Base
      ...PoraclePokemon
    }
  }
`

export const RAID = gql`
  ${base}
  ${Raid}
  mutation Webhook($data: JSON, $category: String!, $status: String!) {
    webhook(data: $data, category: $category, status: $status) {
      ...Base
      ...PoracleRaid
    }
  }
`

export const EGG = gql`
  ${base}
  ${Egg}
  mutation Webhook($data: JSON, $category: String!, $status: String!) {
    webhook(data: $data, category: $category, status: $status) {
      ...Base
      ...PoracleEgg
    }
  }
`

export const GYM = gql`
  ${base}
  ${Gym}
  mutation Webhook($data: JSON, $category: String!, $status: String!) {
    webhook(data: $data, category: $category, status: $status) {
      ...Base
      ...PoracleGym
    }
  }
`

export const INVASION = gql`
  ${base}
  ${Invasion}
  mutation Webhook($data: JSON, $category: String!, $status: String!) {
    webhook(data: $data, category: $category, status: $status) {
      ...Base
      ...PoracleInvasion
    }
  }
`

export const INCIDENT = gql`
  ${base}
  ${Incident}
  mutation Webhook($data: JSON, $category: String!, $status: String!) {
    webhook(data: $data, category: $category, status: $status) {
      ...Base
      ...PoracleIncident
    }
  }
`

export const LURE = gql`
  ${base}
  ${Lure}
  mutation Webhook($data: JSON, $category: String!, $status: String!) {
    webhook(data: $data, category: $category, status: $status) {
      ...Base
      ...PoracleLure
    }
  }
`

export const NEST = gql`
  ${base}
  ${Nest}
  mutation Webhook($data: JSON, $category: String!, $status: String!) {
    webhook(data: $data, category: $category, status: $status) {
      ...Base
      ...PoracleNest
    }
  }
`

export const QUEST = gql`
  ${base}
  ${Quest}
  mutation Webhook($data: JSON, $category: String!, $status: String!) {
    webhook(data: $data, category: $category, status: $status) {
      ...Base
      ...PoracleQuest
    }
  }
`

export const WEBHOOK_CONTEXT = gql`
  query WebhookContext {
    webhookContext {
      name
      templates
      hasNominatim
      addressFormat
      locale
      everything
      prefix
      leagues {
        name
        cp
        min
      }
      pvp
      ui
      capabilities
    }
  }
`

export const WEBHOOK_USER = gql`
  query WebhookUser {
    webhookUser {
      webhooks
      selected
    }
  }
`

export const WEBHOOK_CATEGORIES = gql`
  query WebhookCategory {
    webhookCategories
  }
`

export const WEBHOOK_CHANGE = gql`
  ${base}
  ${Human}
  mutation WebhookChange($webhook: String!) {
    webhookChange(webhook: $webhook) {
      ...Base
      ...PoracleHuman
    }
  }
`

export const WEBHOOK_GEOJSON = gql`
  query WebhookGeojson {
    webhookGeojson
  }
`
