import { gql } from '@apollo/client'

const core = gql`
  fragment CorePokestop on Pokestop {
    id
    name
    url
    lat
    lon
    updated
    last_modified_timestamp
    ar_scan_eligible
  }
`

const lure = gql`
  fragment Lure on Pokestop {
    lure_id
    lure_expire_timestamp
  }
`

const quest = gql`
  fragment Quest on Pokestop {
    quests {
      quest_type
      quest_target
      quest_conditions
      quest_reward_type
      quest_item_id
      quest_task
      item_amount
      stardust_amount
      quest_pokemon_id
      quest_form_id
      quest_gender_id
      quest_costume_id
      quest_shiny
      mega_pokemon_id
      mega_amount
      candy_pokemon_id
      candy_amount
      xl_candy_pokemon_id
      xl_candy_amount
      with_ar
      key
    }
  }
`

const invasion = gql`
  fragment Invasion on Pokestop {
    invasions {
      incident_expire_timestamp
      grunt_type
    }
  }
`

export const getPokestops = gql`
  ${core}
  query Data($minLat: Float!, $minLon: Float!, $maxLat: Float!, $maxLon: Float!, $filters: JSON!, $ts: Int!) {
    pokestops(minLat: $minLat, minLon: $minLon, maxLat: $maxLat, maxLon: $maxLon, filters: $filters, ts: $ts) {
      ...CorePokestop
    }
  }
`

export const getLures = gql`
  ${core}
  ${lure}
  query Data($minLat: Float!, $minLon: Float!, $maxLat: Float!, $maxLon: Float!, $filters: JSON!, $ts: Int!) {
    pokestops(minLat: $minLat, minLon: $minLon, maxLat: $maxLat, maxLon: $maxLon, filters: $filters, ts: $ts) {
      ...CorePokestop
      ...Lure
    }
  }
`

export const getQuests = gql`
  ${core}
  ${quest}
  query Data($minLat: Float!, $minLon: Float!, $maxLat: Float!, $maxLon: Float!, $filters: JSON!, $ts: Int!) {
    pokestops(minLat: $minLat, minLon: $minLon, maxLat: $maxLat, maxLon: $maxLon, filters: $filters, ts: $ts) {
      ...CorePokestop
      ...Quest
    }
  }
`

export const getInvasions = gql`
  ${core}
  ${invasion}
  query Data($minLat: Float!, $minLon: Float!, $maxLat: Float!, $maxLon: Float!, $filters: JSON!, $ts: Int!) {
    pokestops(minLat: $minLat, minLon: $minLon, maxLat: $maxLat, maxLon: $maxLon, filters: $filters, ts: $ts) {
      ...CorePokestop
      ...Invasion
    }
  }
`

export const getLuresQuests = gql`
  ${core}
  ${lure}
  ${quest}
  query Data($minLat: Float!, $minLon: Float!, $maxLat: Float!, $maxLon: Float!, $filters: JSON!, $ts: Int!) {
    pokestops(minLat: $minLat, minLon: $minLon, maxLat: $maxLat, maxLon: $maxLon, filters: $filters, ts: $ts) {
      ...CorePokestop
      ...Lure
      ...Quest
    }
  }
`

export const getLuresInvasions = gql`
  ${core}
  ${lure}
  ${invasion}
  query Data($minLat: Float!, $minLon: Float!, $maxLat: Float!, $maxLon: Float!, $filters: JSON!, $ts: Int!) {
    pokestops(minLat: $minLat, minLon: $minLon, maxLat: $maxLat, maxLon: $maxLon, filters: $filters, ts: $ts) {
      ...CorePokestop
      ...Lure
      ...Invasion
    }
  }
`

export const getQuestsInvasions = gql`
  ${core}
  ${quest}
  ${invasion}
  query Data($minLat: Float!, $minLon: Float!, $maxLat: Float!, $maxLon: Float!, $filters: JSON!, $ts: Int!) {
    pokestops(minLat: $minLat, minLon: $minLon, maxLat: $maxLat, maxLon: $maxLon, filters: $filters, ts: $ts) {
      ...CorePokestop
      ...Quest
      ...Invasion
    }
  }
`

export const getLuresQuestsInvasions = gql`
  ${core}
  ${lure}
  ${quest}
  ${invasion}
  query Data($minLat: Float!, $minLon: Float!, $maxLat: Float!, $maxLon: Float!, $filters: JSON!, $ts: Int!) {
    pokestops(minLat: $minLat, minLon: $minLon, maxLat: $maxLat, maxLon: $maxLon, filters: $filters, ts: $ts) {
      ...CorePokestop
      ...Lure
      ...Quest
      ...Invasion
    }
  }
`

export const getOne = gql`
  query Data($id: ID!, $perm: String!) {
    pokestopsSingle(id: $id, perm: $perm) {
      lat
      lon
    }
  }
`
