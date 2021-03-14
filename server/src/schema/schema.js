import { GraphQLObjectType, GraphQLID, GraphQLFloat, GraphQLList, GraphQLSchema } from 'graphql'
import { ref } from 'objection'

import DeviceType from './device.js'
import GymType from './gym.js'
import PokestopType from './pokestop.js'
import PokemonType from './pokemon.js'
import PortalType from './portals.js'
import s2CellType from './s2Cell.js'
import SpawnpointType from './spawnpoint.js'
import WeatherType from './weather.js'
import { Device, Gym, Pokemon, Pokestop, Portal, S2Cell, Spawnpoint, Weather } from '../models/index.js'

const minMaxArgs = {
  minLat: { type: GraphQLFloat },
  maxLat: { type: GraphQLFloat },
  minLon: { type: GraphQLFloat },
  maxLon: { type: GraphQLFloat }
}

const RootQuery = new GraphQLObjectType({
  name: 'RootQueryType',
  fields: {
    devices: {
      type: new GraphQLList(DeviceType),
      async resolve(parent, args) {
        return await Device.query()
      }
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
      }
    },
    pokestops: {
      type: new GraphQLList(PokestopType),
      args: minMaxArgs,
      async resolve(parent, args) {
        return await Pokestop.query()
          .whereBetween('lat', [args.minLat, args.maxLat])
          .andWhereBetween('lon', [args.minLon, args.maxLon])
          .andWhere('deleted', false)
          .andWhere('updated', '>', 0)
      }
    },
    pokemon: {
      type: new GraphQLList(PokemonType),
      args: minMaxArgs,
      async resolve(parent, args) {
        const ts = Math.floor((new Date).getTime() / 1000)
        return await Pokemon.query()
          .where('expire_timestamp', '>=', ts)
          .andWhereBetween('lat', [args.minLat, args.maxLat])
          .andWhereBetween('lon', [args.minLon, args.maxLon])
      }
    },
    pokemonDetails: {
      type: PokemonType,
      args: {
        id: { type: GraphQLID }
      },
      async resolve(parent, args) {
        const result = await Pokemon.query().findOne('id', args.id)
        result.greatLeague = JSON.parse(result.pvp_rankings_great_league)
        result.ultraLeague = JSON.parse(result.pvp_rankings_ultra_league)
        return result
      }
    },
    portals: {
      type: new GraphQLList(PortalType),
      args: minMaxArgs,
      async resolve(parent, args) {
        return await Portal.query()
          .whereBetween('lat', [args.minLat, args.maxLat])
          .andWhereBetween('lon', [args.minLon, args.maxLon])
      }
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
      }
    },
    spawnpoints: {
      type: new GraphQLList(SpawnpointType),
      args: minMaxArgs,
      async resolve(parent, args) {
        return await Spawnpoint.query()
          .whereBetween('lat', [args.minLat, args.maxLat])
          .andWhereBetween('lon', [args.minLon, args.maxLon])
      }
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
      }
    }
  }
})

export default new GraphQLSchema({ query: RootQuery })
