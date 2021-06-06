/* eslint-disable import/no-unresolved */
const {
  GraphQLObjectType, GraphQLFloat, GraphQLList, GraphQLSchema, GraphQLID, GraphQLString,
} = require('graphql')
const { JSONResolver } = require('graphql-scalars')
const { ref, raw } = require('objection')
const fs = require('fs')

const DeviceType = require('./device')
const GymType = require('./gym')
const NestType = require('./nest')
const PokestopType = require('./pokestop')
const PokemonType = require('./pokemon')
const PortalType = require('./portal')
const S2cellType = require('./s2cell')
const ScanAreaType = require('./scanArea')
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
          return Device.query()
            .join('instance', 'device.instance_name', '=', 'instance.name')
            .select('uuid', 'last_seen', 'last_lat', 'last_lon', 'type', 'instance_name',
              raw('json_extract(data, "$.area")')
                .as('route'))
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
          return Gym.getAllGyms(args, perms)
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
          const result = await Gym.query().findById(args.id) || {}
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
          return Nest.getNestingSpecies(args)
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
          return Pokestop.getAllPokestops(args, perms)
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
          const result = await Pokestop.query().findById(args.id) || {}
          return result
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
          if (Utility.dbSelection('pokemon') === 'mad') {
            return Pokemon.getMadPokemon(args, perms)
          }
          if (args.filters.onlyLegacy) {
            return Pokemon.getLegacy(args, perms)
          }
          return Pokemon.getPokemon(args, perms)
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
          const result = await Pokemon.query().findById(args.id) || {}
          return result
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
          return Portal.query()
            .whereBetween('lat', [args.minLat, args.maxLat])
            .andWhereBetween('lon', [args.minLon, args.maxLon])
        }
      },
    },
    s2cells: {
      type: new GraphQLList(S2cellType),
      args: minMaxArgs,
      async resolve(parent, args, req) {
        const perms = req.user ? req.user.perms : req.session.perms
        if (perms.s2cells) {
          const results = await S2cell.query()
            .select(['*', ref('id')
              .castTo('CHAR')
              .as('id')])
            .whereBetween('center_lat', [args.minLat - 0.01, args.maxLat + 0.01])
            .andWhereBetween('center_lon', [args.minLon - 0.01, args.maxLon + 0.01])
          results.forEach(cell => cell.polygon = Utility.getPolyVector(cell.id, 'polygon'))
          return results
        }
      },
    },
    scanAreas: {
      type: new GraphQLList(ScanAreaType),
      async resolve(parent, args, req) {
        const perms = req.user ? req.user.perms : req.session.perms
        if (perms.scanAreas) {
          const scanAreas = fs.existsSync('server/src/configs/areas.json')
            // eslint-disable-next-line global-require
            ? require('../configs/areas.json') : { features: [] }
          return scanAreas.features.sort(
            (a, b) => (a.properties.name > b.properties.name) ? 1 : -1,
          )
        }
      },
    },
    spawnpoints: {
      type: new GraphQLList(SpawnpointType),
      args: minMaxArgs,
      async resolve(parent, args, req) {
        const perms = req.user ? req.user.perms : req.session.perms
        if (perms.spawnpoints) {
          return Spawnpoint.query()
            .whereBetween('lat', [args.minLat, args.maxLat])
            .andWhereBetween('lon', [args.minLon, args.maxLon])
        }
      },
    },
    submissionCells: {
      type: JSONResolver,
      args: minMaxArgs,
      async resolve(parent, args, req) {
        const perms = req.user ? req.user.perms : req.session.perms
        if (perms.submissionCells) {
          const pokestops = await Pokestop.query()
            .select(['id', 'lat', 'lon'])
            .whereBetween('lat', [args.minLat - 0.025, args.maxLat + 0.025])
            .andWhereBetween('lon', [args.minLon - 0.025, args.maxLon + 0.025])
            .andWhere('deleted', false)
            .andWhere(poi => {
              poi.whereNull('sponsor_id')
                .orWhere('sponsor_id', 0)
            })
          const gyms = await Gym.query()
            .select(['id', 'lat', 'lon'])
            .whereBetween('lat', [args.minLat - 0.025, args.maxLat + 0.025])
            .andWhereBetween('lon', [args.minLon - 0.025, args.maxLon + 0.025])
            .andWhere('deleted', false)
            .andWhere(poi => {
              poi.whereNull('sponsor_id')
                .orWhere('sponsor_id', 0)
            })
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
          const results = await Weather.query()
            .select(['*', ref('id')
              .castTo('CHAR')
              .as('id')])
          results.forEach(cell => cell.polygon = Utility.getPolyVector(cell.id, true))
          return results
        }
      },
    },
  },
})

module.exports = new GraphQLSchema({ query: RootQuery })
