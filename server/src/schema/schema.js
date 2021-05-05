const {
  GraphQLObjectType, GraphQLID, GraphQLFloat, GraphQLList, GraphQLSchema,
} = require('graphql')
const { JSONResolver } = require('graphql-scalars')
const { ref } = require('objection')

const DeviceType = require('./device')
const GymType = require('./gym')
const PokestopType = require('./pokestop')
const PokemonType = require('./pokemon')
const PortalType = require('./portal')
const S2cellType = require('./s2cell')
const SpawnpointType = require('./spawnpoint')
const WeatherType = require('./weather')
const Utility = require('../services/Utility')

const {
  Device, Gym, Pokemon, Pokestop, Portal, S2cell, Spawnpoint, Weather,
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
      async resolve() {
        return Device.query()
      },
    },
    gyms: {
      type: new GraphQLList(GymType),
      args: {
        ...minMaxArgs,
        filters: { type: JSONResolver },
      },
      async resolve(parent, args, req) {
        if (req.user.perms.gyms || req.user.perms.raids) {
          return Gym.getAllGyms(args, req.user.perms)
        }
        return Gym.getAllGyms(args)
      },
    },
    pokestops: {
      type: new GraphQLList(PokestopType),
      args: {
        ...minMaxArgs,
        filters: { type: JSONResolver },
      },
      async resolve(parent, args, req) {
        if (req.user.perms.pokestops
          || req.user.perms.lures
          || req.user.perms.quests
          || req.user.perms.invasions) {
          return Pokestop.getAllPokestops(args, req.user.perms)
        }
      },
    },
    pokemon: {
      type: new GraphQLList(PokemonType),
      args: {
        ...minMaxArgs,
        filters: { type: JSONResolver },
      },
      async resolve(parent, args, req) {
        if (req.user.perms.pokemon) {
          return Pokemon.getPokemon(args, req.user.perms)
        }
      },
    },
    pokemonDetails: {
      type: PokemonType,
      args: {
        id: { type: GraphQLID },
      },
      async resolve(parent, args) {
        const result = await Pokemon.query().findOne('id', args.id)
        result.greatLeague = JSON.parse(result.pvp_rankings_great_league)
        result.ultraLeague = JSON.parse(result.pvp_rankings_ultra_league)
        return result
      },
    },
    portals: {
      type: new GraphQLList(PortalType),
      args: minMaxArgs,
      async resolve(parent, args) {
        return Portal.query()
          .whereBetween('lat', [args.minLat, args.maxLat])
          .andWhereBetween('lon', [args.minLon, args.maxLon])
      },
    },
    s2cells: {
      type: new GraphQLList(S2cellType),
      args: minMaxArgs,
      async resolve(parent, args) {
        const s2cells = await S2cell.query()
          .select(['*', ref('id')
            .castTo('CHAR')
            .as('id')])
          .whereBetween('center_lat', [args.minLat, args.maxLat])
          .andWhereBetween('center_lon', [args.minLon, args.maxLon])
        s2cells.forEach(cell => cell.polygon = Utility.getPolyVector(cell.id, 'polygon'))
        return s2cells
      },
    },
    spawnpoints: {
      type: new GraphQLList(SpawnpointType),
      args: minMaxArgs,
      async resolve(parent, args) {
        return Spawnpoint.query()
          .whereBetween('lat', [args.minLat, args.maxLat])
          .andWhereBetween('lon', [args.minLon, args.maxLon])
      },
    },
    submissionCells: {
      type: JSONResolver,
      args: minMaxArgs,
      async resolve(parent, args) {
        const pokestops = await Pokestop.getAllPokestops(args)
        const gyms = await Gym.getAllGyms(args)
        return {
          placementCells: Utility.getPlacementCells(args, pokestops, gyms),
          typeCells: Utility.getTypeCells(args, pokestops, gyms),
        }
      },
    },
    weather: {
      type: new GraphQLList(WeatherType),
      async resolve() {
        const weather = await Weather.query()
          .select(['*', ref('id')
            .castTo('CHAR')
            .as('id')])
        weather.forEach(cell => cell.polygon = Utility.getPolyVector(cell.id, 'polyline'))
        return weather
      },
    },
  },
})

module.exports = new GraphQLSchema({ query: RootQuery })
