const { gql } = require('apollo-server-express')

module.exports = gql`
  type Available {
    masterfile: JSON
    pokestops: [String]
    gyms: [String]
    pokemon: [String]
    nests: [String]
    filters: JSON
    questConditions: JSON
  }

  type Badge {
    id: String
    name: String
    url: String
    lat: Float
    lon: Float
    badge: Int
    deleted: Boolean
  }

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

  type ScanArea {
    type: String
    features: [JSON]
  }

  type ScanAreasMenu {
    name: String
    details: JSON
    children: JSON
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
    pokemon_id: Int
    form: Int
    gender: Int
    costume: Int
    shiny: Int
    iv: Float
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
    xp_amount: Int
    with_ar: Boolean
    quest_title: String
    quest_target: Int
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
