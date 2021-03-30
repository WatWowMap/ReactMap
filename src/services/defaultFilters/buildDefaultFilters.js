import buildPokemon from './buildPokemon'
import buildQuests from './buildQuests'
import buildInvasions from './buildInvasions'

export default function buildDefault(serverSettings) {
  const filters = {
    gyms: {
      enabled: serverSettings.config.map.filters.gyms,
      filter: {},
    },
    raids: {
      enabled: serverSettings.config.map.filters.raids,
      filter: {},
    },
    pokestops: {
      enabled: serverSettings.config.map.filters.pokestops,
      filter: {
        p0: { enabled: true, size: 'md' },
        p501: { enabled: true, size: 'md' },
        p502: { enabled: true, size: 'md' },
        p503: { enabled: true, size: 'md' },
        p504: { enabled: true, size: 'md' },
        ...buildInvasions(),
        ...buildQuests(serverSettings.quests),
      },
    },
    spawnpoints: {
      enabled: serverSettings.config.map.filters.spawnpoints,
      filter: {},
    },
    pokemon: {
      enabled: serverSettings.config.map.filters.pokemon,
      filter: buildPokemon('pokemon'),
    },
    portals: {
      enabled: serverSettings.config.map.filters.portals,
      filter: {},
    },
    scanCells: {
      enabled: serverSettings.config.map.filters.scanCells,
      filter: {},
    },
    submissionCells: {
      enabled: serverSettings.config.map.filters.submissionCells,
      filter: {},
    },
    weather: {
      enabled: serverSettings.config.map.filters.weather,
      filter: {},
    },
    scanAreas: {
      enabled: serverSettings.config.map.filters.scanAreas,
      filter: {},
    },
    devices: {
      enabled: serverSettings.config.map.filters.devices,
      filter: {},
    },
  }
  return filters
}
