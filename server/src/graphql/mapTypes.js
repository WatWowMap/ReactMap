const { gql } = require('apollo-server-express')

module.exports = gql`
    type Geocoder {
    latitude: Float
    longitude: Float
    streetNumber: String
    streetName: String
    neighborhood: String
    suburb: String
    city: String
    state: String
    zipcode: String
    country: String
    countryCode: String
    provider: String
  }

  type Geometry {
    type: String 
    coordinates: [[[Float]]]
  }

  type Feature {
    type: String
    properties: JSON
    geometry: Geometry
  }

  type ScanArea {
    type: String
    features: [Feature]
  }

  type Search {
    id: ID
    name: String
    url: String
    lat: Float
    lon: Float
    distance: Float
    formatted: Geocoder
    nest_pokemon_id: Int
    nest_pokemon_form: Int
    raid_pokemon_id: Int
    raid_pokemon_form: Int
    raid_pokemon_gender: Int
    raid_pokemon_costume: Int
    raid_pokemon_evolution: Int
  }

  type SearchQuest {
    id: ID
    name: String
    lat: Float
    lon: Float
    distance: Float
    formatted: Geocoder
    quest_pokemon_id: Int
    quest_form_id: Int
    quest_gender_id: Int
    quest_costume_id: Int
    quest_item_id: Int
    quest_reward_type: Int
    quest_shiny: Int
    mega_pokemon_id: Int
    mega_amount: Int
    stardust_amount: Int
    item_amount: Int
    candy_pokemon_id: Int
    candy_amount: Int
    with_ar: Boolean
  }

  type WayfarerCell {
    id: String
    level: Int
    count: Int
    count_pokestops: Int
    count_gyms: Int
    polygon: [[Float]]
    blocked: Boolean
  }

  type Ring {
    id: ID
    lat: Float
    lon: Float
  }

  type PlacementCell {
    cells: [WayfarerCell]
    rings: [Ring]
  }

  type SubmissionCell {
    placementCells: PlacementCell
    typeCells: [WayfarerCell]
  }
`
