import { gql } from '@apollo/client'

const egg = gql`
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
    }
  }
`

const human = gql`
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

const gym = gql`
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
    }
  }
`

const invasion = gql`
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
    }
  }
`

const lure = gql`
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
    }
  }
`

const nest = gql`
  fragment PoracleNest on Poracle {
    nest {
      clean
      distance
      id
      min_spawn_avg
      ping
      pokemon_id
      profile_no
      template
      uid
    }
  }
`

const pokemon = gql`
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
      rarity
      sta
      template
      uid
    }
  }
`

const profile = gql`
  fragment PoracleProfile on Poracle {
    profile {
      active_hours
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

const quest = gql`
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
    }
  }
`

const raid = gql`
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
    }
  }
`

const weather = gql`
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
    }
  }
`

export const allProfiles = gql`
  ${human}
  ${egg}
  ${gym}
  ${invasion}
  ${lure}
  ${nest}
  ${pokemon}
  ${profile}
  ${quest}
  ${raid}
  ${weather}
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

export const setHuman = gql`
  ${human}
  mutation Webhook($data: JSON!, $category: String!, $status: String!) {
    webhook(data: $data, category: $category, status: $status) {
      category
      message
      status
      ...PoracleHuman
    }
  }
`
