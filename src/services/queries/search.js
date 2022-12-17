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
    $onlyAreas: [String]
  ) {
    search(
      search: $search
      category: $category
      lat: $lat
      lon: $lon
      locale: $locale
      onlyAreas: $onlyAreas
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
    $onlyAreas: [String]
  ) {
    search(
      search: $search
      category: $category
      lat: $lat
      lon: $lon
      locale: $locale
      webhookName: $webhookName
      onlyAreas: $onlyAreas
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
    $onlyAreas: [String]
  ) {
    search(
      search: $search
      category: $category
      lat: $lat
      lon: $lon
      locale: $locale
      onlyAreas: $onlyAreas
    ) {
      ...CoreSearch
      nest_pokemon_id
      nest_pokemon_form
    }
  }
`

export const pokemon = gql`
  ${core}
  query SearchPokemon(
    $search: String!
    $category: String!
    $lat: Float!
    $lon: Float!
    $locale: String!
    $onlyAreas: [String]
  ) {
    search(
      search: $search
      category: $category
      lat: $lat
      lon: $lon
      locale: $locale
      onlyAreas: $onlyAreas
    ) {
      ...CoreSearch
      pokemon_id
      pokemon_id
      form
      gender
      costume
      shiny
      iv
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
    $onlyAreas: [String]
  ) {
    searchQuest(
      search: $search
      category: $category
      lat: $lat
      lon: $lon
      locale: $locale
      midnight: $midnight
      onlyAreas: $onlyAreas
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
      xp_amount
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
    $onlyAreas: [String]
  ) {
    search(
      search: $search
      category: $category
      lat: $lat
      lon: $lon
      locale: $locale
      ts: $ts
      onlyAreas: $onlyAreas
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
