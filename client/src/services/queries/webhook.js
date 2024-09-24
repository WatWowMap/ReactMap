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
    egg {
      distance
      clean
      exclusive
      gym_id
      ping
      level
      id
      profile_no
      team
      template
      uid
      description
    }
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
    gym {
      clean
      gym_id
      distance
      id
      ping
      profile_no
      slot_changes
      team
      template
      uid
      description
    }
  }
`

const Invasion = gql`
  fragment PoracleInvasion on Poracle {
    invasion {
      clean
      gender
      distance
      grunt_type
      id
      ping
      profile_no
      template
      uid
      description
      real_grunt_id
    }
  }
`

const Lure = gql`
  fragment PoracleLure on Poracle {
    lure {
      distance
      clean
      id
      lure_id
      ping
      template
      uid
      profile_no
      description
    }
  }
`

const Nest = gql`
  fragment PoracleNest on Poracle {
    nest {
      clean
      distance
      id
      min_spawn_avg
      ping
      pokemon_id
      form
      profile_no
      template
      uid
    }
  }
`

const Pokemon = gql`
  fragment PoraclePokemon on Poracle {
    pokemon {
      atk
      clean
      def
      description
      distance
      form
      gender
      id
      max_atk
      max_cp
      max_def
      max_iv
      max_level
      max_rarity
      max_sta
      max_weight
      min_cp
      min_iv
      min_level
      min_time
      min_weight
      ping
      pokemon_id
      profile_no
      pvp_ranking_best
      pvp_ranking_league
      pvp_ranking_min_cp
      pvp_ranking_worst
      pvp_ranking_cap
      rarity
      size
      max_size
      sta
      template
      uid
      description
      allForms
      pvpEntry
      xs
      xl
    }
  }
`

export const PROFILE = gql`
  fragment PoracleProfile on Poracle {
    profile {
      active_hours {
        day
        hours
        mins
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
    quest {
      amount
      clean
      form
      distance
      id
      ping
      profile_no
      reward
      reward_type
      shiny
      template
      uid
      description
    }
  }
`

const Raid = gql`
  fragment PoracleRaid on Poracle {
    raid {
      exclusive
      distance
      clean
      form
      gym_id
      level
      move
      id
      ping
      pokemon_id
      profile_no
      team
      template
      uid
      description
      allMoves
    }
  }
`

const Weather = gql`
  fragment PoracleWeather on Poracle {
    weather {
      cell
      clean
      condition
      id
      ping
      profile_no
      template
      uid
      description
    }
  }
`

export const ALL_PROFILES = gql`
  ${Human}
  ${Egg}
  ${Gym}
  ${Invasion}
  ${Lure}
  ${Nest}
  ${Pokemon}
  ${PROFILE}
  ${Quest}
  ${Raid}
  ${Weather}
  query Webhook($category: String!, $status: String!) {
    webhook(category: $category, status: $status) {
      ...PoracleHuman
      ...PoracleEgg
      ...PoracleGym
      ...PoracleInvasion
      ...PoracleLure
      ...PoracleNest
      ...PoraclePokemon
      ...PoracleProfile
      ...PoracleQuest
      ...PoracleRaid
      ...PoracleWeather
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
  ${Invasion}
  ${Lure}
  ${Nest}
  ${Pokemon}
  ${PROFILE}
  ${Quest}
  ${Raid}
  ${Weather}
  mutation Webhook($data: JSON, $category: String!, $status: String!) {
    webhook(data: $data, category: $category, status: $status) {
      ...PoracleHuman
      ...PoracleEgg
      ...PoracleGym
      ...PoracleInvasion
      ...PoracleLure
      ...PoracleNest
      ...PoraclePokemon
      ...PoracleProfile
      ...PoracleQuest
      ...PoracleRaid
      ...PoracleWeather
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
