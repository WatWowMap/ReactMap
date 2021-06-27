/* eslint-disable import/no-unresolved */
const {
  GraphQLObjectType, GraphQLFloat, GraphQLList, GraphQLSchema, GraphQLID, GraphQLString,
} = require('graphql')
const { JSONResolver } = require('graphql-scalars')
const fs = require('fs')
const { raw } = require('objection')

const DeviceType = require('./device')
const GymType = require('./gym')
const NestType = require('./nest')
const PokestopType = require('./pokestop')
const PokemonType = require('./pokemon')
const PortalType = require('./portal')
const S2cellType = require('./s2cell')
const ScanAreaType = require('./scanArea')
const SearchType = require('./search')
const SpawnpointType = require('./spawnpoint')
const WeatherType = require('./weather')
const Utility = require('../services/Utility')

const {
  Device, Gym, Pokemon, Pokestop, Portal, S2cell, Spawnpoint, Weather, Nest,
} = require('../models/index')

const minMaxArgs = {
  minLat: { type: GraphQLFloat },
  maxLat: { type: GraphQLFloat },
  minLon: { type: GraphQLFloat },
  maxLon: { type: GraphQLFloat },
}

const RootQuery = new GraphQLObjectType({
  name: 'RootQueryType',
  fields: {
    devices: {
      type: new GraphQLList(DeviceType),
      async resolve(parent, args, req) {
        const perms = req.user ? req.user.perms : req.session.perms
        if (perms.devices) {
          return Device.getAllDevices(perms, Utility.dbSelection('device') === 'mad')
        }
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
        if (perms.gyms || perms.raids) {
          return Gym.getAllGyms(args, perms, Utility.dbSelection('gym') === 'mad')
        }
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
        if (perms[args.perm]) {
          const query = Gym.query()
            .findById(args.id)
          if (Utility.dbSelection('gym') === 'mad') {
            query.select([
              'latitude AS lat',
              'longitude AS lon',
            ])
          }
          const result = await query || {}
          return result
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
        if (perms.nests) {
          return Nest.getNestingSpecies(args, perms)
        }
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
        if (perms[args.perm]) {
          const result = await Nest.query().findById(args.id) || {}
          return result
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
        if (perms.pokestops
          || perms.lures
          || perms.quests
          || perms.invasions) {
          return Pokestop.getAllPokestops(args, perms, Utility.dbSelection('pokestop') === 'mad')
        }
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
        if (perms[args.perm]) {
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
        if (perms.pokemon) {
          const isMad = Utility.dbSelection('pokemon') === 'mad'
          if (args.filters.onlyLegacy && !isMad) {
            return Pokemon.getLegacy(args, perms)
          }
          return Pokemon.getPokemon(args, perms, isMad)
        }
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
        if (perms[args.perm]) {
          const query = Pokemon.query().findById(args.id) || {}
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
        if (perms.portals) {
          return Portal.getAllPortals(args, perms)
        }
      },
    },
    s2cells: {
      type: new GraphQLList(S2cellType),
      args: minMaxArgs,
      async resolve(parent, args, req) {
        const perms = req.user ? req.user.perms : req.session.perms
        if (perms.s2cells) {
          return S2cell.getAllCells(args, perms, Utility.dbSelection('pokestop') === 'mad')
        }
      },
    },
    scanAreas: {
      type: new GraphQLList(ScanAreaType),
      async resolve(parent, args, req) {
        const perms = req.user ? req.user.perms : req.session.perms
        if (perms.scanAreas) {
          const scanAreas = fs.existsSync('server/src/configs/areas.json')
            ? JSON.parse(fs.readFileSync('./server/src/configs/areas.json'))
            : { features: [] }
          return scanAreas.features.sort(
            (a, b) => (a.properties.name > b.properties.name) ? 1 : -1,
          )
        }
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
      },
      async resolve(parent, args, req) {
        const perms = req.user ? req.user.perms : req.session.perms
        const { category } = args
        if (perms[category]) {
          const isMad = Utility.dbSelection(category.substring(0, category.length - 1)) === 'mad'
          const distance = raw(`ROUND(( 3959 * acos( cos( radians(${args.lat}) ) * cos( radians( ${isMad ? 'latitude' : 'lat'} ) ) * cos( radians( ${isMad ? 'longitude' : 'lon'} ) - radians(${args.lon}) ) + sin( radians(${args.lat}) ) * sin( radians( ${isMad ? 'latitude' : 'lat'} ) ) ) ),2)`).as('distance')

          if (args.search === '') {
            return []
          }
          switch (args.category) {
            default: return []
            case 'quests':
              return Pokestop.searchQuests(args, perms, isMad, distance)
            case 'pokestops':
              return Pokestop.search(args, perms, isMad, distance)
            case 'raids':
              return Gym.searchRaids(args, perms, isMad, distance)
            case 'gyms':
              return Gym.search(args, perms, isMad, distance)
            case 'portals':
              return Portal.search(args, perms, isMad, distance)
            case 'nests':
              return Nest.search(args, perms, isMad, distance)
          }
        }
      },
    },
    spawnpoints: {
      type: new GraphQLList(SpawnpointType),
      args: minMaxArgs,
      async resolve(parent, args, req) {
        const perms = req.user ? req.user.perms : req.session.perms
        if (perms.spawnpoints) {
          return Spawnpoint.getAllSpawnpoints(args, perms, Utility.dbSelection('spawnpoint') === 'mad')
        }
      },
    },
    submissionCells: {
      type: JSONResolver,
      args: minMaxArgs,
      async resolve(parent, args, req) {
        const perms = req.user ? req.user.perms : req.session.perms
        if (perms.submissionCells) {
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
            placementCells: Utility.getPlacementCells(args, pokestops, gyms),
            typeCells: Utility.getTypeCells(args, pokestops, gyms),
          }]
        }
      },
    },
    weather: {
      type: new GraphQLList(WeatherType),
      async resolve(parent, args, req) {
        const perms = req.user ? req.user.perms : req.session.perms
        if (perms.weather) {
          return Weather.getAllWeather(Utility.dbSelection('weather') === 'mad')
        }
      },
    },
  },
})

module.exports = new GraphQLSchema({ query: RootQuery })
