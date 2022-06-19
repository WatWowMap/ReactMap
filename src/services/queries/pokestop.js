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
    power_up_level
    power_up_points
    power_up_end_timestamp
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
      quest_title
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
  query Pokestops(
    $minLat: Float!
    $minLon: Float!
    $maxLat: Float!
    $maxLon: Float!
    $filters: JSON!
    $ts: Int!
    $midnight: Int!
    $version: String
  ) {
    pokestops(
      minLat: $minLat
      minLon: $minLon
      maxLat: $maxLat
      maxLon: $maxLon
      filters: $filters
      ts: $ts
      midnight: $midnight
      version: $version
    ) {
      ...CorePokestop
    }
  }
`

export const getLures = gql`
  ${core}
  ${lure}
  query Lures(
    $minLat: Float!
    $minLon: Float!
    $maxLat: Float!
    $maxLon: Float!
    $filters: JSON!
    $ts: Int!
    $midnight: Int!
    $version: String
  ) {
    pokestops(
      minLat: $minLat
      minLon: $minLon
      maxLat: $maxLat
      maxLon: $maxLon
      filters: $filters
      ts: $ts
      midnight: $midnight
      version: $version
    ) {
      ...CorePokestop
      ...Lure
    }
  }
`

export const getQuests = gql`
  ${core}
  ${quest}
  query Quests(
    $minLat: Float!
    $minLon: Float!
    $maxLat: Float!
    $maxLon: Float!
    $filters: JSON!
    $ts: Int!
    $midnight: Int!
    $version: String
  ) {
    pokestops(
      minLat: $minLat
      minLon: $minLon
      maxLat: $maxLat
      maxLon: $maxLon
      filters: $filters
      ts: $ts
      midnight: $midnight
      version: $version
    ) {
      ...CorePokestop
      ...Quest
    }
  }
`

export const getInvasions = gql`
  ${core}
  ${invasion}
  query Invasions(
    $minLat: Float!
    $minLon: Float!
    $maxLat: Float!
    $maxLon: Float!
    $filters: JSON!
    $ts: Int!
    $midnight: Int!
    $version: String
  ) {
    pokestops(
      minLat: $minLat
      minLon: $minLon
      maxLat: $maxLat
      maxLon: $maxLon
      filters: $filters
      ts: $ts
      midnight: $midnight
      version: $version
    ) {
      ...CorePokestop
      ...Invasion
    }
  }
`

export const getLuresQuests = gql`
  ${core}
  ${lure}
  ${quest}
  query LuresQuests(
    $minLat: Float!
    $minLon: Float!
    $maxLat: Float!
    $maxLon: Float!
    $filters: JSON!
    $ts: Int!
    $midnight: Int!
    $version: String
  ) {
    pokestops(
      minLat: $minLat
      minLon: $minLon
      maxLat: $maxLat
      maxLon: $maxLon
      filters: $filters
      ts: $ts
      midnight: $midnight
      version: $version
    ) {
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
  query LuresInvasion(
    $minLat: Float!
    $minLon: Float!
    $maxLat: Float!
    $maxLon: Float!
    $filters: JSON!
    $ts: Int!
    $midnight: Int!
    $version: String
  ) {
    pokestops(
      minLat: $minLat
      minLon: $minLon
      maxLat: $maxLat
      maxLon: $maxLon
      filters: $filters
      ts: $ts
      midnight: $midnight
      version: $version
    ) {
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
  query QuestsInvasions(
    $minLat: Float!
    $minLon: Float!
    $maxLat: Float!
    $maxLon: Float!
    $filters: JSON!
    $ts: Int!
    $midnight: Int!
    $version: String
  ) {
    pokestops(
      minLat: $minLat
      minLon: $minLon
      maxLat: $maxLat
      maxLon: $maxLon
      filters: $filters
      ts: $ts
      midnight: $midnight
      version: $version
    ) {
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
  query LuresQuestInvasions(
    $minLat: Float!
    $minLon: Float!
    $maxLat: Float!
    $maxLon: Float!
    $filters: JSON!
    $ts: Int!
    $midnight: Int!
    $version: String
  ) {
    pokestops(
      minLat: $minLat
      minLon: $minLon
      maxLat: $maxLat
      maxLon: $maxLon
      filters: $filters
      ts: $ts
      midnight: $midnight
      version: $version
    ) {
      ...CorePokestop
      ...Lure
      ...Quest
      ...Invasion
    }
  }
`

export const getOne = gql`
  query GetOnePokestop($id: ID!, $perm: String!, $version: String) {
    pokestopsSingle(id: $id, perm: $perm, version: $version) {
      lat
      lon
    }
  }
`
