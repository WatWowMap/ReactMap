const config = require('../config.js')
const buildPokemon = require('./buildPokemon.js')
const buildQuests = require('./buildQuests.js')
const buildInvasions = require('./buildInvasions.js')
const { Pokestop } = require('../../models/index')

module.exports = async function buildDefault() {
  const filters = {
    gyms: {
      enabled: config.map.filters.gyms,
      filter: {},
    },
    raids: {
      enabled: config.map.filters.raids,
      filter: {},
    },
    pokestops: {
      enabled: config.map.filters.pokestops,
      filter: {
        p0: { enabled: true, size: 'md' },
        p501: { enabled: true, size: 'md' },
        p502: { enabled: true, size: 'md' },
        p503: { enabled: true, size: 'md' },
        p504: { enabled: true, size: 'md' },
        ...buildInvasions(),
        ...buildQuests(await Pokestop.getAvailableQuests()),
      },
    },
    spawnpoints: {
      enabled: config.map.filters.spawnpoints,
      filter: {},
    },
    pokemon: {
      enabled: config.map.filters.pokemon,
      filter: buildPokemon('pokemon'),
    },
    portals: {
      enabled: config.map.filters.portals,
      filter: {},
    },
    scanCells: {
      enabled: config.map.filters.scanCells,
      filter: {},
    },
    submissionCells: {
      enabled: config.map.filters.submissionCells,
      filter: {},
    },
    weather: {
      enabled: config.map.filters.weather,
      filter: {},
    },
    scanAreas: {
      enabled: config.map.filters.scanAreas,
      filter: {},
    },
    devices: {
      enabled: config.map.filters.devices,
      filter: {},
    },
  }
  return filters
}
