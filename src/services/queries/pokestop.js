import { gql } from '@apollo/client'

const core = gql`
  fragment Core on Pokestop {
    id
    name
    lat
    lon
    updated
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
    quest_rewards
    quest_pokemon_id
  }
`

const invasion = gql`
  fragment Invasion on Pokestop {
    incident_expire_timestamp
    grunt_type
  }
`

export const getPokestops = gql`
  ${core}
  query Data($minLat: Float!, $minLon: Float!, $maxLat: Float!, $maxLon: Float!, $filters: JSON! ) {
    pokestops(minLat: $minLat, minLon: $minLon, maxLat: $maxLat, maxLon: $maxLon, filters: $filters) {
      ...Core
    }
  }
`

export const getLures = gql`
  ${core}
  ${lure}
  query Data($minLat: Float!, $minLon: Float!, $maxLat: Float!, $maxLon: Float!, $filters: JSON! ) {
    pokestops(minLat: $minLat, minLon: $minLon, maxLat: $maxLat, maxLon: $maxLon, filters: $filters) {
      ...Core
      ...Lure
    }
  }
`

export const getQuests = gql`
  ${core}
  ${quest}
  query Data($minLat: Float!, $minLon: Float!, $maxLat: Float!, $maxLon: Float!, $filters: JSON! ) {
    pokestops(minLat: $minLat, minLon: $minLon, maxLat: $maxLat, maxLon: $maxLon, filters: $filters) {
      ...Core
      ...Quest
    }
  }
`

export const getInvasions = gql`
  ${core}
  ${invasion}
  query Data($minLat: Float!, $minLon: Float!, $maxLat: Float!, $maxLon: Float!, $filters: JSON! ) {
    pokestops(minLat: $minLat, minLon: $minLon, maxLat: $maxLat, maxLon: $maxLon, filters: $filters) {
      ...Core
      ...Invasion
    }
  }
`

export const getLuresQuests = gql`
  ${core}
  ${lure}
  ${quest}
  query Data($minLat: Float!, $minLon: Float!, $maxLat: Float!, $maxLon: Float!, $filters: JSON! ) {
    pokestops(minLat: $minLat, minLon: $minLon, maxLat: $maxLat, maxLon: $maxLon, filters: $filters) {
      ...Core
      ...Lure
      ...Quest
    }
  }
`

export const getLuresInvasions = gql`
  ${core}
  ${lure}
  ${invasion}
  query Data($minLat: Float!, $minLon: Float!, $maxLat: Float!, $maxLon: Float!, $filters: JSON! ) {
    pokestops(minLat: $minLat, minLon: $minLon, maxLat: $maxLat, maxLon: $maxLon, filters: $filters) {
      ...Core
      ...Lure
      ...Invasion
    }
  }
`

export const getQuestsInvasions = gql`
  ${core}
  ${quest}
  ${invasion}
  query Data($minLat: Float!, $minLon: Float!, $maxLat: Float!, $maxLon: Float!, $filters: JSON! ) {
    pokestops(minLat: $minLat, minLon: $minLon, maxLat: $maxLat, maxLon: $maxLon, filters: $filters) {
      ...Core
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
  query Data($minLat: Float!, $minLon: Float!, $maxLat: Float!, $maxLon: Float!, $filters: JSON! ) {
    pokestops(minLat: $minLat, minLon: $minLon, maxLat: $maxLat, maxLon: $maxLon, filters: $filters) {
      ...Core
      ...Lure
      ...Quest
      ...Invasion
    }
  }
`
