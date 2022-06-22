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
  query SearchPoi(
    $search: String!
    $category: String!
    $lat: Float!
    $lon: Float!
    $locale: String!
    $version: String
    $userAreas: [String]
  ) {
    search(
      search: $search
      category: $category
      lat: $lat
      lon: $lon
      locale: $locale
      version: $version
      userAreas: $userAreas
    ) {
      ...CoreSearch
    }
  }
`

export const poiWebhook = gql`
  ${Nominatim}
  query SearchWebhook(
    $search: String!
    $category: String!
    $lat: Float!
    $lon: Float!
    $locale: String!
    $webhookName: String
    $version: String
    $userAreas: [String]
  ) {
    search(
      search: $search
      category: $category
      lat: $lat
      lon: $lon
      locale: $locale
      webhookName: $webhookName
      version: $version
      userAreas: $userAreas
    ) {
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
  query SearchNests(
    $search: String!
    $category: String!
    $lat: Float!
    $lon: Float!
    $locale: String!
    $version: String
    $userAreas: [String]
  ) {
    search(
      search: $search
      category: $category
      lat: $lat
      lon: $lon
      locale: $locale
      version: $version
      userAreas: $userAreas
    ) {
      ...CoreSearch
      nest_pokemon_id
      nest_pokemon_form
    }
  }
`

export const quests = gql`
  query SearchQuests(
    $search: String!
    $category: String!
    $lat: Float!
    $lon: Float!
    $locale: String!
    $midnight: Int
    $version: String
    $userAreas: [String]
  ) {
    searchQuest(
      search: $search
      category: $category
      lat: $lat
      lon: $lon
      locale: $locale
      midnight: $midnight
      version: $version
      userAreas: $userAreas
    ) {
      id
      name
      lat
      lon
      distance
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
      with_ar
      quest_title
      quest_target
    }
  }
`

export const raids = gql`
  ${core}
  query SearchRaids(
    $search: String!
    $category: String!
    $lat: Float!
    $lon: Float!
    $locale: String!
    $ts: Int
    $version: String
    $userAreas: [String]
  ) {
    search(
      search: $search
      category: $category
      lat: $lat
      lon: $lon
      locale: $locale
      ts: $ts
      version: $version
      userAreas: $userAreas
    ) {
      ...CoreSearch
      raid_pokemon_id
      raid_pokemon_form
      raid_pokemon_gender
      raid_pokemon_costume
      raid_pokemon_evolution
    }
  }
`
