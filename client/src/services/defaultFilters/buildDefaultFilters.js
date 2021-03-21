import buildPokemon from './buildPokemon.js'

export default function (config) {
  const filters = {
    gyms: {
      enabled: config.map.filters.gyms,
      filter: {}
    },
    raids: {
      enabled: config.map.filters.raids,
      filter: {}
    },
    pokestops: {
      enabled: config.map.filters.pokestops,
      filter: {}
    },
    quests: {
      enabled: config.map.filters.quests,
      filter: {}
    },
    invasions: {
      enabled: config.map.filters.invasions,
      filter: {}
    },
    spawnpoints: {
      enabled: config.map.filters.spawnpoints,
      filter: {}
    },
    pokemon: {
      enabled: config.map.filters.pokemon,
      filter: buildPokemon('pokemon')
    },
    portals: {
      enabled: config.map.filters.portals,
      filter: {}
    },
    scanCells: {
      enabled: config.map.filters.scanCells,
      filter: {}
    },
    submissionCells: {
      enabled: config.map.filters.submissionCells,
      filter: {}
    },
    weather: {
      enabled: config.map.filters.weather,
      filter: {}
    },
    scanAreas: {
      enabled: config.map.filters.scanAreas,
      filter: {}
    },
    devices: {
      enabled: config.map.filters.devices,
      filter: {}
    }
  }
  return filters
}