/* eslint-disable no-console */
const {
  GraphQLObjectType, GraphQLFloat, GraphQLList, GraphQLSchema, GraphQLID, GraphQLString, GraphQLInt,
} = require('graphql')
const { JSONResolver } = require('graphql-scalars')
const fs = require('fs')
const { raw } = require('objection')

const scanAreas = fs.existsSync('server/src/configs/areas.json')
  // eslint-disable-next-line global-require
  ? require('../configs/areas.json')
  : { features: [] }

const DeviceType = require('../schema/device')
const GeocoderType = require('../schema/geocoder')
const GymType = require('../schema/gym')
const NestType = require('../schema/nest')
const PokestopType = require('../schema/pokestop')
const PokemonType = require('../schema/pokemon')
const PoracleType = require('../schema/poracle')
const PortalType = require('../schema/portal')
const S2cellType = require('../schema/s2cell')
const ScanAreaType = require('../schema/scanArea')
const SearchType = require('../schema/search')
const SpawnpointType = require('../schema/spawnpoint')
const WeatherType = require('../schema/weather')
const Utility = require('../services/Utility')
const Fetch = require('../services/Fetch')
const config = require('../services/config')
const {
  Device, Gym, Pokemon, Pokestop, Portal, S2cell, Spawnpoint, Weather, Nest,
} = require('../models/index')

const minMaxArgs = {
  minLat: { type: GraphQLFloat },
  maxLat: { type: GraphQLFloat },
  minLon: { type: GraphQLFloat },
  maxLon: { type: GraphQLFloat },
  ts: { type: GraphQLInt },
  midnight: { type: GraphQLInt },
}

const RootQuery = new GraphQLObjectType({
  name: 'RootQueryType',
  fields: {
    devices: {
      type: new GraphQLList(DeviceType),
      async resolve(parent, args, req) {
        const perms = req.user ? req.user.perms : req.session.perms
        if (perms?.devices) {
          return Device.getAllDevices(perms, Utility.dbSelection('device') === 'mad')
        }
        return []
      },
    },
    geocoder: {
      type: new GraphQLList(GeocoderType),
      args: {
        search: { type: GraphQLString },
        name: { type: GraphQLString },
      },
      async resolve(parent, args, req) {
        const perms = req.user ? req.user.perms : req.session.perms
        if (perms?.webhooks) {
          const webhook = config.webhookObj[args.name]
          if (webhook) {
            return Utility.geocoder(webhook.server.nominatimUrl, args.search)
          }
        }
        return []
      },
    },
    gyms: {
      type: new GraphQLList(GymType),
      args: {
        ...minMaxArgs,
        filters: { type: JSONResolver },
      },
      async resolve(parent, args, req) {
        const perms = req.user ? req.user.perms : req.session.perms
        if (perms?.gyms || perms?.raids) {
          return Gym.getAllGyms(args, perms, Utility.dbSelection('gym') === 'mad')
        }
        return []
      },
    },
    gymsSingle: {
      type: GymType,
      args: {
        id: { type: GraphQLID },
        perm: { type: GraphQLString },
      },
      async resolve(parent, args, req) {
        const perms = req.user ? req.user.perms : req.session.perms
        if (perms?.[args.perm]) {
          const query = Gym.query()
            .findById(args.id)
          if (Utility.dbSelection('gym') === 'mad') {
            query.select([
              'latitude AS lat',
              'longitude AS lon',
            ])
          }
          const result = await query
          return result || {}
        }
        return {}
      },
    },
    nests: {
      type: new GraphQLList(NestType),
      args: {
        ...minMaxArgs,
        filters: { type: JSONResolver },
      },
      async resolve(parent, args, req) {
        const perms = req.user ? req.user.perms : req.session.perms
        if (perms?.nests) {
          return Nest.getNestingSpecies(args, perms)
        }
        return []
      },
    },
    nestsSingle: {
      type: NestType,
      args: {
        id: { type: GraphQLID },
        perm: { type: GraphQLString },
      },
      async resolve(parent, args, req) {
        const perms = req.user ? req.user.perms : req.session.perms
        if (perms?.[args.perm]) {
          return Nest.query().findById(args.id) || {}
        }
        return {}
      },
    },
    pokestops: {
      type: new GraphQLList(PokestopType),
      args: {
        ...minMaxArgs,
        filters: { type: JSONResolver },
      },
      async resolve(parent, args, req) {
        const perms = req.user ? req.user.perms : req.session.perms
        if (perms?.pokestops
          || perms?.lures
          || perms?.quests
          || perms?.invasions) {
          return Pokestop.getAllPokestops(args, perms, Utility.dbSelection('pokestop') === 'mad')
        }
        return []
      },
    },
    pokestopsSingle: {
      type: PokestopType,
      args: {
        id: { type: GraphQLID },
        perm: { type: GraphQLString },
      },
      async resolve(parent, args, req) {
        const perms = req.user ? req.user.perms : req.session.perms
        if (perms?.[args.perm]) {
          const query = Pokestop.query()
            .findById(args.id)
          if (Utility.dbSelection('pokestop') === 'mad') {
            query.select([
              'latitude AS lat',
              'longitude AS lon',
            ])
          }
          const result = await query
          return result || {}
        }
        return {}
      },
    },
    pokemon: {
      type: new GraphQLList(PokemonType),
      args: {
        ...minMaxArgs,
        filters: { type: JSONResolver },
      },
      async resolve(parent, args, req) {
        const perms = req.user ? req.user.perms : req.session.perms
        if (perms?.pokemon) {
          const isMad = Utility.dbSelection('pokemon') === 'mad'
          if (args.filters.onlyLegacy) {
            return Pokemon.getLegacy(args, perms, isMad)
          }
          return Pokemon.getPokemon(args, perms, isMad)
        }
        return []
      },
    },
    pokemonSingle: {
      type: PokemonType,
      args: {
        id: { type: GraphQLID },
        perm: { type: GraphQLString },
      },
      async resolve(parent, args, req) {
        const perms = req.user ? req.user.perms : req.session.perms
        if (perms?.[args.perm]) {
          const query = Pokemon.query().findById(args.id)
          if (Utility.dbSelection('pokemon') === 'mad') {
            query.select([
              'latitude AS lat',
              'longitude AS lon',
            ])
          }
          const result = await query
          return result || {}
        }
        return {}
      },
    },
    portals: {
      type: new GraphQLList(PortalType),
      args: minMaxArgs,
      async resolve(parent, args, req) {
        const perms = req.user ? req.user.perms : req.session.perms
        if (perms?.portals) {
          return Portal.getAllPortals(args, perms)
        }
        return []
      },
    },
    portalsSingle: {
      type: PortalType,
      args: {
        id: { type: GraphQLID },
        perm: { type: GraphQLString },
      },
      async resolve(parent, args, req) {
        const perms = req.user ? req.user.perms : req.session.perms
        if (perms?.[args.perm]) {
          return Portal.query().findById(args.id) || {}
        }
        return {}
      },
    },
    s2cells: {
      type: new GraphQLList(S2cellType),
      args: {
        ...minMaxArgs,
        zoom: { type: GraphQLInt },
      },
      async resolve(parent, args, req) {
        const perms = req.user ? req.user.perms : req.session.perms
        if (perms?.s2cells && args.zoom >= config.map.scanCellsZoom) {
          return S2cell.getAllCells(args, perms, Utility.dbSelection('pokestop') === 'mad')
        }
        return []
      },
    },
    scanAreas: {
      type: ScanAreaType,
      async resolve(parent, args, req) {
        const perms = req.user ? req.user.perms : req.session.perms
        if (perms?.scanAreas && scanAreas.features.length) {
          try {
            scanAreas.features = scanAreas.features.sort((a, b) => (a.properties.name > b.properties.name) ? 1 : -1)
          } catch (e) {
            console.warn('Failed to sort scan areas', e.message)
          }
        }
        return scanAreas
      },
    },
    search: {
      type: new GraphQLList(SearchType),
      args: {
        search: { type: GraphQLString },
        category: { type: GraphQLString },
        lat: { type: GraphQLFloat },
        lon: { type: GraphQLFloat },
        locale: { type: GraphQLString },
        webhookName: { type: GraphQLString },
        ts: { type: GraphQLInt },
        midnight: { type: GraphQLInt },
      },
      async resolve(parent, args, req) {
        const perms = req.user ? req.user.perms : req.session.perms
        const { category, webhookName } = args
        if (perms?.[category]) {
          const isMad = Utility.dbSelection(category.substring(0, category.length - 1)) === 'mad'
          const distance = raw(`ROUND(( 3959 * acos( cos( radians(${args.lat}) ) * cos( radians( ${isMad ? 'latitude' : 'lat'} ) ) * cos( radians( ${isMad ? 'longitude' : 'lon'} ) - radians(${args.lon}) ) + sin( radians(${args.lat}) ) * sin( radians( ${isMad ? 'latitude' : 'lat'} ) ) ) ),2)`).as('distance')

          if (args.search === '') {
            return []
          }
          switch (args.category) {
            case 'quests':
              return Pokestop.searchQuests(args, perms, isMad, distance)
            case 'pokestops':
              return Pokestop.search(args, perms, isMad, distance)
            case 'raids':
              return Gym.searchRaids(args, perms, isMad, distance)
            case 'gyms': {
              const results = await Gym.search(args, perms, isMad, distance)
              const webhook = webhookName ? config.webhookObj[webhookName] : null
              if (webhook && results.length) {
                const withFormatted = await Promise.all(results.map(async result => ({
                  ...result,
                  formatted: await Utility.geocoder(
                    webhook.server.nominatimUrl, { lat: result.lat, lon: result.lon }, true,
                  ),
                })))
                return withFormatted
              }
              return results
            }
            case 'portals':
              return Portal.search(args, perms, isMad, distance)
            case 'nests':
              return Nest.search(args, perms, isMad, distance)
            default: return []
          }
        }
        return []
      },
    },
    spawnpoints: {
      type: new GraphQLList(SpawnpointType),
      args: minMaxArgs,
      async resolve(parent, args, req) {
        const perms = req.user ? req.user.perms : req.session.perms
        if (perms?.spawnpoints) {
          return Spawnpoint.getAllSpawnpoints(args, perms, Utility.dbSelection('spawnpoint') === 'mad')
        }
        return []
      },
    },
    submissionCells: {
      type: JSONResolver,
      args: {
        ...minMaxArgs,
        zoom: { type: GraphQLInt },
      },
      async resolve(parent, args, req) {
        const perms = req.user ? req.user.perms : req.session.perms
        if (perms?.submissionCells && args.zoom >= config.map.submissionZoom - 1) {
          const isMadStops = Utility.dbSelection('pokestop') === 'mad'
          const isMadGyms = Utility.dbSelection('gym') === 'mad'

          const stopQuery = Pokestop.query()
          if (isMadStops) {
            stopQuery.select([
              'pokestop_id AS id',
              'latitude AS lat',
              'longitude AS lon',
            ])
          } else {
            stopQuery.select(['id', 'lat', 'lon'])
              .andWhere(poi => {
                poi.whereNull('sponsor_id')
                  .orWhere('sponsor_id', 0)
              })
          }

          const gymQuery = Gym.query()
          if (isMadGyms) {
            gymQuery.select([
              'gym_id AS id',
              'latitude AS lat',
              'longitude AS lon',
            ])
          } else {
            gymQuery.select(['id', 'lat', 'lon'])
              .where(poi => {
                poi.whereNull('sponsor_id')
                  .orWhere('sponsor_id', 0)
              })
          }

          [stopQuery, gymQuery].forEach((query, i) => {
            const isMad = [isMadStops, isMadGyms]
            query.whereBetween(`lat${isMad[i] ? 'itude' : ''}`, [args.minLat - 0.025, args.maxLat + 0.025])
              .andWhereBetween(`lon${isMad[i] ? 'gitude' : ''}`, [args.minLon - 0.025, args.maxLon + 0.025])
              .andWhere(isMad[i] ? 'enabled' : 'deleted', isMad[i])
          })
          const pokestops = await stopQuery
          const gyms = await gymQuery
          return [{
            placementCells: args.zoom >= config.map.submissionZoom
              ? Utility.getPlacementCells(args, pokestops, gyms)
              : [],
            typeCells: Utility.getTypeCells(args, pokestops, gyms),
          }]
        }
        return [{ placementCells: [], typeCells: [] }]
      },
    },
    weather: {
      type: new GraphQLList(WeatherType),
      async resolve(parent, args, req) {
        const perms = req.user ? req.user.perms : req.session.perms
        if (perms?.weather) {
          return Weather.getAllWeather(Utility.dbSelection('weather') === 'mad')
        }
        return []
      },
    },
    webhook: {
      type: PoracleType,
      args: {
        category: { type: GraphQLString },
        status: { type: GraphQLString },
        name: { type: GraphQLString },
      },
      async resolve(parent, args, req) {
        const perms = req.user ? req.user.perms : req.session.perms
        if (perms?.webhooks) {
          return Fetch.webhookApi(args.category, req.user.id, args.status, args.name)
        }
        return {}
      },
    },
  },
})

const Mutation = new GraphQLObjectType({
  name: 'Mutation',
  fields: {
    webhook: {
      type: PoracleType,
      args: {
        category: { type: GraphQLString },
        data: { type: JSONResolver },
        status: { type: GraphQLString },
        name: { type: GraphQLString },
      },
      async resolve(parent, args, req) {
        const perms = req.user ? req.user.perms : false
        const { category, data, status, name } = args
        if (perms?.webhooks.includes(name)) {
          const response = await Fetch.webhookApi(category, req.user.id, status, name, data)
          return response
        }
        return {}
      },
    },
  },
})

module.exports = new GraphQLSchema({ query: RootQuery, mutation: Mutation })
