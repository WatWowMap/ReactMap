import { gql } from '@apollo/client'

export default gql`
query Data($search: String!, $category: String!, $lat: Float!, $lon: Float!, $locale: String!) {
  search(search: $search, category: $category, lat: $lat, lon: $lon, locale: $locale) {
    name
    url
    lat
    lon
    distance
    quest_pokemon_id
    quest_pokemon_form
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
}`
