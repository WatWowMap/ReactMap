/* eslint-disable no-return-await */
const {
  GraphQLObjectType, GraphQLID, GraphQLFloat, GraphQLList, GraphQLSchema,
} = require('graphql')
const { JSONResolver } = require('graphql-scalars')
const { ref } = require('objection')

const DeviceType = require('./device.js')
const GymType = require('./gym.js')
const PokestopType = require('./pokestop.js')
const PokemonType = require('./pokemon.js')
const PortalType = require('./portals.js')
const s2CellType = require('./s2Cell.js')
const SpawnpointType = require('./spawnpoint.js')
const WeatherType = require('./weather.js')

const {
  Device, Gym, Pokemon, Pokestop, Portal, S2Cell, Spawnpoint, Weather,
} = require('../models/index.js')

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
        return await Device.query()
      },
    },
    gyms: {
      type: new GraphQLList(GymType),
      args: minMaxArgs,
      async resolve(parent, args) {
        return await Gym.query()
          .whereBetween('lat', [args.minLat, args.maxLat])
          .andWhereBetween('lon', [args.minLon, args.maxLon])
          .andWhere('deleted', false)
          .andWhere('updated', '>', 0)
      },
    },
    pokestops: {
      type: new GraphQLList(PokestopType),
      args: {
        ...minMaxArgs,
        filters: { type: JSONResolver },
      },
      async resolve(parent, args) {
        return await Pokestop.query()
          .whereBetween('lat', [args.minLat, args.maxLat])
          .andWhereBetween('lon', [args.minLon, args.maxLon])
          .andWhere('deleted', false)
          .andWhere('updated', '>', 0)
      },
    },
    pokemon: {
      type: new GraphQLList(PokemonType),
      args: {
        ...minMaxArgs,
        filters: { type: JSONResolver },
      },
      async resolve(parent, args) {
        return await Pokemon.getPokemon(args)
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
        return await Portal.query()
          .whereBetween('lat', [args.minLat, args.maxLat])
          .andWhereBetween('lon', [args.minLon, args.maxLon])
      },
    },
    quests: {
      type: JSONResolver,
      async resolve() {
        return await Pokestop.getAvailableQuests()
      },
    },
    s2Cells: {
      type: new GraphQLList(s2CellType),
      args: minMaxArgs,
      async resolve(parent, args) {
        return await S2Cell.query()
          .select(['*', ref('id')
            .castTo('CHAR')
            .as('id')])
          .whereBetween('center_lat', [args.minLat, args.maxLat])
          .andWhereBetween('center_lon', [args.minLon, args.maxLon])
      },
    },
    spawnpoints: {
      type: new GraphQLList(SpawnpointType),
      args: minMaxArgs,
      async resolve(parent, args) {
        return await Spawnpoint.query()
          .whereBetween('lat', [args.minLat, args.maxLat])
          .andWhereBetween('lon', [args.minLon, args.maxLon])
      },
    },
    weather: {
      type: new GraphQLList(WeatherType),
      args: minMaxArgs,
      async resolve(parent, args) {
        return await Weather.query()
          .select(['*', ref('id')
            .castTo('CHAR')
            .as('id')])
          .whereBetween('latitude', [args.minLat, args.maxLat])
          .andWhereBetween('longitude', [args.minLon, args.maxLon])
      },
    },
  },
})

module.exports = new GraphQLSchema({ query: RootQuery })
