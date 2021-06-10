const { defaultFilters } = require('../config.js')
const buildPokemon = require('./buildPokemon.js')
const buildPokestops = require('./buildPokestops.js')
const buildGyms = require('./buildGyms')
const { GenericFilter, PokemonFilter } = require('../../models/index')
const { database: { schemas }, map: { legacyPkmnFilter } } = require('../config')

const base = new PokemonFilter()
base.pvp()
const custom = new PokemonFilter(...Object.values(defaultFilters.pokemon.globalValues))
custom.pvp(defaultFilters.pokemon.pvpValues)

module.exports = function buildDefault(perms) {
  const stopReducer = perms.pokestops || perms.lures || perms.quests || perms.invasions
  const gymReducer = perms.gyms || perms.raids
  const pokemonReducer = perms.iv || perms.stats || perms.pvp
  const hasAr = poi => Object.values(schemas).some(
    schema => schema.useFor.includes(poi) && schema.arScanColumn === true,
  )
  const pokemon = buildPokemon(defaultFilters, base, custom)

  return {
    gyms: gymReducer ? {
      enabled: defaultFilters.gyms.enabled,
      gyms: perms.gyms ? defaultFilters.gyms.enabled : undefined,
      raids: perms.raids ? defaultFilters.gyms.raids : undefined,
      exEligible: perms.gyms ? defaultFilters.gyms.exEligible : undefined,
      inBattle: perms.gyms ? defaultFilters.gyms.exEligible : undefined,
      arEligible: hasAr('gym') && perms.gyms ? false : undefined,
      filter: {
        ...buildGyms(perms, defaultFilters.gyms),
        ...pokemon.raids,
      },
    } : undefined,
    nests: perms.nests ? {
      enabled: defaultFilters.nests.enabled,
      pokemon: defaultFilters.nests.pokemon,
      polygons: defaultFilters.nests.polygons,
      filter: pokemon.nests,
    } : undefined,
    pokestops: stopReducer ? {
      enabled: defaultFilters.pokestops.enabled,
      allPokestops: perms.pokestops ? defaultFilters.pokestops.enabled : undefined,
      lures: perms.lures ? defaultFilters.pokestops.lures : undefined,
      quests: perms.quests ? defaultFilters.pokestops.quests : undefined,
      invasions: perms.invasions ? defaultFilters.pokestops.invasions : undefined,
      arEligible: hasAr('pokestop') && perms.pokestops ? false : undefined,
      filter: {
        ...buildPokestops(perms, defaultFilters.pokestops),
        ...pokemon.quests,
      },
    } : undefined,
    pokemon: perms.pokemon ? {
      enabled: defaultFilters.pokemon.enabled,
      legacy: (pokemonReducer && legacyPkmnFilter) ? defaultFilters.pokemon.legacyFilter : undefined,
      iv: perms.iv ? true : undefined,
      stats: perms.stats ? true : undefined,
      pvp: perms.pvp ? true : undefined,
      standard: base,
      ivOr: custom,
      xsRat: false,
      xlKarp: false,
      zeroIv: perms.iv ? false : undefined,
      filter: pokemon.full,
    } : undefined,
    portals: perms.portals ? {
      enabled: defaultFilters.portals.enabled,
      filter: {
        global: new GenericFilter(),
        old: new GenericFilter(),
        new: new GenericFilter(),
      },
    } : undefined,
    scanAreas: perms.scanAreas ? {
      enabled: defaultFilters.scanAreas.enabled,
      filter: {},
    } : undefined,
    submissionCells: perms.submissionCells ? {
      enabled: defaultFilters.submissionCells.enabled,
      filter: { global: new GenericFilter() },
    } : undefined,
    weather: perms.weather ? {
      enabled: defaultFilters.weather.enabled,
      filter: { global: new GenericFilter() },
    } : undefined,
    spawnpoints: perms.spawnpoints ? {
      enabled: defaultFilters.spawnpoints.enabled,
      filter: {
        global: new GenericFilter(),
        confirmed: new GenericFilter(),
        unconfirmed: new GenericFilter(),
      },
    } : undefined,
    s2cells: perms.s2cells ? {
      enabled: defaultFilters.scanCells.enabled,
      filter: { global: new GenericFilter() },
    } : undefined,
    devices: perms.devices ? {
      enabled: defaultFilters.devices.enabled,
      filter: {
        online: new GenericFilter(),
        offline: new GenericFilter(),
        global: new GenericFilter(),
      },
    } : undefined,
  }
}
