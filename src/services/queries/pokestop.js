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
    hasShowcase
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
      xp_amount
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
      confirmed
      slot_1_pokemon_id
      slot_1_form
      slot_2_pokemon_id
      slot_2_form
      slot_3_pokemon_id
      slot_3_form
    }
  }
`

const event = gql`
  fragment Event on Pokestop {
    events {
      display_type
      event_expire_timestamp
      showcase_pokemon_id
      showcase_pokemon_form_id
      showcase_pokemon_type_id
      showcase_ranking_standard
      showcase_rankings {
        total_entries
        last_update
        contest_entries {
          rank
          pokemon_id
          form
          costume
          gender
          score
        }
      }
    }
  }
`

export const GET_POKESTOPS = gql`
  ${core}
  query Pokestops(
    $minLat: Float!
    $minLon: Float!
    $maxLat: Float!
    $maxLon: Float!
    $filters: JSON!
  ) {
    pokestops(
      minLat: $minLat
      minLon: $minLon
      maxLat: $maxLat
      maxLon: $maxLon
      filters: $filters
    ) {
      ...CorePokestop
    }
  }
`

export const GET_LURES = gql`
  ${core}
  ${lure}
  query Lures(
    $minLat: Float!
    $minLon: Float!
    $maxLat: Float!
    $maxLon: Float!
    $filters: JSON!
  ) {
    pokestops(
      minLat: $minLat
      minLon: $minLon
      maxLat: $maxLat
      maxLon: $maxLon
      filters: $filters
    ) {
      ...CorePokestop
      ...Lure
    }
  }
`

export const GET_QUESTS = gql`
  ${core}
  ${quest}
  query Quests(
    $minLat: Float!
    $minLon: Float!
    $maxLat: Float!
    $maxLon: Float!
    $filters: JSON!
  ) {
    pokestops(
      minLat: $minLat
      minLon: $minLon
      maxLat: $maxLat
      maxLon: $maxLon
      filters: $filters
    ) {
      ...CorePokestop
      ...Quest
    }
  }
`

export const GET_INVASIONS = gql`
  ${core}
  ${invasion}
  query Invasions(
    $minLat: Float!
    $minLon: Float!
    $maxLat: Float!
    $maxLon: Float!
    $filters: JSON!
  ) {
    pokestops(
      minLat: $minLat
      minLon: $minLon
      maxLat: $maxLat
      maxLon: $maxLon
      filters: $filters
    ) {
      ...CorePokestop
      ...Invasion
    }
  }
`

export const GET_EVENTS = gql`
  ${core}
  ${event}
  query Events(
    $minLat: Float!
    $minLon: Float!
    $maxLat: Float!
    $maxLon: Float!
    $filters: JSON!
  ) {
    pokestops(
      minLat: $minLat
      minLon: $minLon
      maxLat: $maxLat
      maxLon: $maxLon
      filters: $filters
    ) {
      ...CorePokestop
      ...Event
    }
  }
`

export const GET_LURES_QUESTS = gql`
  ${core}
  ${lure}
  ${quest}
  query LuresQuests(
    $minLat: Float!
    $minLon: Float!
    $maxLat: Float!
    $maxLon: Float!
    $filters: JSON!
  ) {
    pokestops(
      minLat: $minLat
      minLon: $minLon
      maxLat: $maxLat
      maxLon: $maxLon
      filters: $filters
    ) {
      ...CorePokestop
      ...Lure
      ...Quest
    }
  }
`

export const GET_LURES_INVASIONS = gql`
  ${core}
  ${lure}
  ${invasion}
  query LuresInvasion(
    $minLat: Float!
    $minLon: Float!
    $maxLat: Float!
    $maxLon: Float!
    $filters: JSON!
  ) {
    pokestops(
      minLat: $minLat
      minLon: $minLon
      maxLat: $maxLat
      maxLon: $maxLon
      filters: $filters
    ) {
      ...CorePokestop
      ...Lure
      ...Invasion
    }
  }
`

export const GET_LURES_EVENTS = gql`
  ${core}
  ${lure}
  ${event}
  query LuresEvents(
    $minLat: Float!
    $minLon: Float!
    $maxLat: Float!
    $maxLon: Float!
    $filters: JSON!
  ) {
    pokestops(
      minLat: $minLat
      minLon: $minLon
      maxLat: $maxLat
      maxLon: $maxLon
      filters: $filters
    ) {
      ...CorePokestop
      ...Lure
      ...Event
    }
  }
`

export const GET_QUESTS_INVASIONS = gql`
  ${core}
  ${quest}
  ${invasion}
  query QuestsInvasions(
    $minLat: Float!
    $minLon: Float!
    $maxLat: Float!
    $maxLon: Float!
    $filters: JSON!
  ) {
    pokestops(
      minLat: $minLat
      minLon: $minLon
      maxLat: $maxLat
      maxLon: $maxLon
      filters: $filters
    ) {
      ...CorePokestop
      ...Quest
      ...Invasion
    }
  }
`

export const GET_QUESTS_EVENTS = gql`
  ${core}
  ${quest}
  ${event}
  query QuestsEvents(
    $minLat: Float!
    $minLon: Float!
    $maxLat: Float!
    $maxLon: Float!
    $filters: JSON!
  ) {
    pokestops(
      minLat: $minLat
      minLon: $minLon
      maxLat: $maxLat
      maxLon: $maxLon
      filters: $filters
    ) {
      ...CorePokestop
      ...Quest
      ...Event
    }
  }
`

export const GET_INVASIONS_EVENTS = gql`
  ${core}
  ${invasion}
  ${event}
  query InvasionsEvents(
    $minLat: Float!
    $minLon: Float!
    $maxLat: Float!
    $maxLon: Float!
    $filters: JSON!
  ) {
    pokestops(
      minLat: $minLat
      minLon: $minLon
      maxLat: $maxLat
      maxLon: $maxLon
      filters: $filters
    ) {
      ...CorePokestop
      ...Invasion
      ...Event
    }
  }
`

export const GET_LURES_QUESTS_INVASIONS = gql`
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
  ) {
    pokestops(
      minLat: $minLat
      minLon: $minLon
      maxLat: $maxLat
      maxLon: $maxLon
      filters: $filters
    ) {
      ...CorePokestop
      ...Lure
      ...Quest
      ...Invasion
    }
  }
`

export const GET_LURES_QUESTS_EVENTS = gql`
  ${core}
  ${lure}
  ${quest}
  ${event}
  query LuresQuestEvents(
    $minLat: Float!
    $minLon: Float!
    $maxLat: Float!
    $maxLon: Float!
    $filters: JSON!
  ) {
    pokestops(
      minLat: $minLat
      minLon: $minLon
      maxLat: $maxLat
      maxLon: $maxLon
      filters: $filters
    ) {
      ...CorePokestop
      ...Lure
      ...Quest
      ...Event
    }
  }
`

export const GET_LURES_INVASIONS_EVENTS = gql`
  ${core}
  ${lure}
  ${invasion}
  ${event}
  query LuresInvasionsEvents(
    $minLat: Float!
    $minLon: Float!
    $maxLat: Float!
    $maxLon: Float!
    $filters: JSON!
  ) {
    pokestops(
      minLat: $minLat
      minLon: $minLon
      maxLat: $maxLat
      maxLon: $maxLon
      filters: $filters
    ) {
      ...CorePokestop
      ...Lure
      ...Invasion
      ...Event
    }
  }
`

export const GET_QUESTS_INVASIONS_EVENTS = gql`
  ${core}
  ${quest}
  ${invasion}
  ${event}
  query QuestsInvasionsEvents(
    $minLat: Float!
    $minLon: Float!
    $maxLat: Float!
    $maxLon: Float!
    $filters: JSON!
  ) {
    pokestops(
      minLat: $minLat
      minLon: $minLon
      maxLat: $maxLat
      maxLon: $maxLon
      filters: $filters
    ) {
      ...CorePokestop
      ...Quest
      ...Invasion
      ...Event
    }
  }
`

export const GET_LURES_QUESTS_INVASIONS_EVENTS = gql`
  ${core}
  ${lure}
  ${quest}
  ${invasion}
  ${event}
  query LuresQuestInvasionsEvents(
    $minLat: Float!
    $minLon: Float!
    $maxLat: Float!
    $maxLon: Float!
    $filters: JSON!
  ) {
    pokestops(
      minLat: $minLat
      minLon: $minLon
      maxLat: $maxLat
      maxLon: $maxLon
      filters: $filters
    ) {
      ...CorePokestop
      ...Lure
      ...Quest
      ...Invasion
      ...Event
    }
  }
`

export const GET_ONE_POKESTOP = gql`
  query GetOnePokestop($id: ID!, $perm: String!) {
    pokestopsSingle(id: $id, perm: $perm) {
      lat
      lon
    }
  }
`
