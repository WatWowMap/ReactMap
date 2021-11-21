import { gql } from '@apollo/client'
import { Nominatim } from './geocoder'

const core = gql`
  fragment CoreSearch on Search {
    id
    name
    url
    lat
    lon
    distance
  }
`

export const poi = gql`
  ${core}
  query Data($search: String!, $category: String!, $lat: Float!, $lon: Float!, $locale: String!, $ts: Int) {
    search(search: $search, category: $category, lat: $lat, lon: $lon, locale: $locale, ts: $ts) {
      ...CoreSearch
    }
  }
`

export const poiWebhook = gql`
  ${Nominatim}
  query Data($search: String!, $category: String!, $lat: Float!, $lon: Float!, $locale: String!, $webhookName: String, $ts: Int) {
    search(search: $search, category: $category, lat: $lat, lon: $lon, locale: $locale, webhookName: $webhookName, ts: $ts) {
      id
      name
      formatted {
        ...Nominatim
      }
    }
  }
`

export const nests = gql`
  ${core}
  query Data($search: String!, $category: String!, $lat: Float!, $lon: Float!, $locale: String!, $ts: Int) {
    search(search: $search, category: $category, lat: $lat, lon: $lon, locale: $locale, ts: $ts) {
      ...CoreSearch
      nest_pokemon_id
      nest_pokemon_form
    }
  }
`

export const quests = gql`
  ${core}
  query Data($search: String!, $category: String!, $lat: Float!, $lon: Float!, $locale: String!, $ts: Int!, $midnight: Int) {
    search(search: $search, category: $category, lat: $lat, lon: $lon, locale: $locale, ts: $ts, midnight: $midnight) {
      ...CoreSearch
      quest_pokemon_id
      quest_form_id
      quest_gender_id
      quest_costume_id
      quest_shiny
      quest_item_id
      quest_reward_type
      mega_pokemon_id
      mega_amount
      stardust_amount
      item_amount
      candy_pokemon_id
      candy_amount
    }
  }
`

export const raids = gql`
  ${core}
  query Data($search: String!, $category: String!, $lat: Float!, $lon: Float!, $locale: String!, $ts: Int) {
    search(search: $search, category: $category, lat: $lat, lon: $lon, locale: $locale, ts: $ts) {
      ...CoreSearch
      raid_pokemon_id
      raid_pokemon_form
      raid_pokemon_gender
      raid_pokemon_costume
      raid_pokemon_evolution
    }
  }
`
