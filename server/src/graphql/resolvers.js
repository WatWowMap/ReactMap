/* eslint-disable no-console */
const GraphQLJSON = require('graphql-type-json')
const { raw } = require('objection')

const config = require('../services/config')
const {
  Device, Gym, Pokemon, Pokestop, Portal, ScanCell, Spawnpoint, Weather, Nest, User, Badge,
} = require('../models/index')
const Utility = require('../services/Utility')
const Fetch = require('../services/Fetch')

module.exports = {
  JSON: GraphQLJSON,
  Query: {
    badges: (parent, args, { req }) => {
      const perms = req.user ? req.user.perms : req.session.perms
      if (perms?.gymBadges) {
        return Gym.getGymBadges(Utility.dbSelection('gym').type === 'mad', req?.user?.id)
      }
      return []
    },
    devices: (parent, args, { req }) => {
      const perms = req.user ? req.user.perms : req.session.perms
      if (perms?.devices) {
        return Device.getAllDevices(perms, Utility.dbSelection('device').type === 'mad')
      }
      return []
    },
    geocoder: (parent, args, { req }) => {
      const perms = req.user ? req.user.perms : req.session.perms
      if (perms?.webhooks) {
        const webhook = config.webhookObj[args.name]
        if (webhook) {
          return Utility.geocoder(webhook.server.nominatimUrl, args.search)
        }
      }
      return []
    },
    gyms: (parent, args, { req }) => {
      const perms = req.user ? req.user.perms : req.session.perms
      if (perms?.gyms || perms?.raids) {
        return Gym.getAllGyms(args, perms, Utility.dbSelection('gym').type === 'mad', req?.user?.id)
      }
      return []
    },
    gymsSingle: (parent, args, { req }) => {
      const perms = req.user ? req.user.perms : req.session.perms
      if (perms?.[args.perm]) {
        const query = Gym.query()
          .findById(args.id)
        if (Utility.dbSelection('gym').type === 'mad') {
          query.select([
            'latitude AS lat',
            'longitude AS lon',
          ])
        }
        return query || {}
      }
      return {}
    },
    nests: (parent, args, { req }) => {
      const perms = req.user ? req.user.perms : req.session.perms
      if (perms?.nests) {
        return Nest.getNestingSpecies(args, perms)
      }
      return []
    },
    nestsSingle: (parent, args, { req }) => {
      const perms = req.user ? req.user.perms : req.session.perms
      if (perms?.[args.perm]) {
        return Nest.query().findById(args.id) || {}
      }
      return {}
    },
    pokestops: (parent, args, { req }) => {
      const perms = req.user ? req.user.perms : req.session.perms
      if (perms?.pokestops
        || perms?.lures
        || perms?.quests
        || perms?.invasions) {
        return Pokestop.getAllPokestops(args, perms, Utility.dbSelection('pokestop').type === 'mad')
      }
      return []
    },
    pokestopsSingle: (parent, args, { req }) => {
      const perms = req.user ? req.user.perms : req.session.perms
      if (perms?.[args.perm]) {
        const query = Pokestop.query()
          .findById(args.id)
        if (Utility.dbSelection('pokestop').type === 'mad') {
          query.select([
            'latitude AS lat',
            'longitude AS lon',
          ])
        }
        return query || {}
      }
      return {}
    },
    pokemon: (parent, args, { req }) => {
      const perms = req.user ? req.user.perms : req.session.perms
      if (perms?.pokemon) {
        const isMad = Utility.dbSelection('pokemon').type === 'mad'
        if (args.filters.onlyLegacy) {
          return Pokemon.getLegacy(args, perms, isMad)
        }
        return Pokemon.getPokemon(args, perms, isMad)
      }
      return []
    },
    pokemonSingle: (parent, args, { req }) => {
      const perms = req.user ? req.user.perms : req.session.perms
      if (perms?.[args.perm]) {
        const query = Pokemon.query().findById(args.id)
        if (Utility.dbSelection('pokemon').type === 'mad') {
          query.select([
            'latitude AS lat',
            'longitude AS lon',
          ])
        }
        return query || {}
      }
      return {}
    },
    portals: (parent, args, { req }) => {
      const perms = req.user ? req.user.perms : req.session.perms
      if (perms?.portals) {
        return Portal.getAllPortals(args, perms)
      }
      return []
    },
    portalsSingle: (parent, args, { req }) => {
      const perms = req.user ? req.user.perms : req.session.perms
      if (perms?.[args.perm]) {
        return Portal.query().findById(args.id) || {}
      }
      return {}
    },
    scanCells: (parent, args, { req }) => {
      const perms = req.user ? req.user.perms : req.session.perms
      if (perms?.scanCells && args.zoom >= config.map.scanCellsZoom) {
        return ScanCell.getAllCells(args, perms, Utility.dbSelection('pokestop').type === 'mad')
      }
      return []
    },
    scanAreas: (parent, args, { req }) => {
      const perms = req.user ? req.user.perms : req.session.perms
      const scanAreas = config.scanAreas[req.headers.host]
        ? config.scanAreas[req.headers.host]
        : config.scanAreas.main
      if (perms?.scanAreas && scanAreas.features.length) {
        try {
          scanAreas.features = scanAreas.features
            .sort((a, b) => (a.properties.name > b.properties.name) ? 1 : -1)
        } catch (e) {
          console.warn('Failed to sort scan areas', e.message)
        }
      }
      return [scanAreas]
    },
    search: async (parent, args, { req }) => {
      const perms = req.user ? req.user.perms : req.session.perms
      const { category, webhookName } = args
      if (perms?.[category]) {
        const isMad = Utility.dbSelection(category.substring(0, category.length - 1)).type === 'mad'
        const distance = raw(`ROUND(( 3959 * acos( cos( radians(${args.lat}) ) * cos( radians( ${isMad ? 'latitude' : 'lat'} ) ) * cos( radians( ${isMad ? 'longitude' : 'lon'} ) - radians(${args.lon}) ) + sin( radians(${args.lat}) ) * sin( radians( ${isMad ? 'latitude' : 'lat'} ) ) ) ),2)`).as('distance')

        if (args.search === '') {
          return []
        }
        switch (args.category) {
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
    searchQuest: async (parent, args, { req }) => {
      const perms = req.user ? req.user.perms : req.session.perms
      const { category } = args
      if (perms?.[category]) {
        const isMad = Utility.dbSelection(category.substring(0, category.length - 1)).type === 'mad'
        const distance = raw(`ROUND(( 3959 * acos( cos( radians(${args.lat}) ) * cos( radians( ${isMad ? 'latitude' : 'lat'} ) ) * cos( radians( ${isMad ? 'longitude' : 'lon'} ) - radians(${args.lon}) ) + sin( radians(${args.lat}) ) * sin( radians( ${isMad ? 'latitude' : 'lat'} ) ) ) ),2)`).as('distance')

        if (args.search === '') {
          return []
        }
        return Pokestop.searchQuests(args, perms, isMad, distance) || []
      }
    },
    spawnpoints: (parent, args, { req }) => {
      const perms = req.user ? req.user.perms : req.session.perms
      if (perms?.spawnpoints) {
        return Spawnpoint.getAllSpawnpoints(args, perms, Utility.dbSelection('spawnpoint').type === 'mad')
      }
      return []
    },
    submissionCells: async (parent, args, { req }) => {
      const perms = req.user ? req.user.perms : req.session.perms
      if (perms?.submissionCells && args.zoom >= config.map.submissionZoom - 1) {
        const isMadStops = Utility.dbSelection('pokestop').type === 'mad'
        const isMadGyms = Utility.dbSelection('gym').type === 'mad'

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
    weather: (parent, args, { req }) => {
      const perms = req.user ? req.user.perms : req.session.perms
      if (perms?.weather) {
        return Weather.getAllWeather(Utility.dbSelection('weather').type === 'mad')
      }
      return []
    },
    webhook: (parent, args, { req }) => {
      const perms = req.user ? req.user.perms : req.session.perms
      if (perms?.webhooks) {
        return Fetch.webhookApi(args.category, req.user.id, args.status, args.name)
      }
      return {}
    },
    scanner: (parent, args, { req }) => {
      const perms = req.user ? req.user.perms : req.session.perms
      const { category, method, data } = args
      if (perms?.scanner?.includes(category)) {
        return Fetch.scannerApi(category, method, data)
      }
      return {}
    },
  },
  Mutation: {
    webhook: (parent, args, { req }) => {
      const perms = req.user ? req.user.perms : false
      const { category, data, status, name } = args
      if (perms?.webhooks?.includes(name)) {
        const id = req.user.strategy === 'discord' ? req.user.discordId : req.user.telegramId
        return Fetch.webhookApi(category, id, status, name, data)
      }
      return {}
    },
    tutorial: async (parent, args, { req }) => {
      if (req.user) {
        await User.query()
          .update({ tutorial: args.tutorial })
          .where('id', req.user.id)
        return true
      }
      if (req.session) {
        req.session.tutorial = true
        req.session.save()
      }
      return false
    },
    strategy: async (parent, args, { req }) => {
      if (req.user) {
        await User.query()
          .update({ webhookStrategy: args.strategy })
          .where('id', req.user.id)
        return true
      }
      return false
    },
    checkUsername: async (parent, args) => {
      const results = await User.query()
        .where('username', args.username)
      return Boolean(results.length)
    },
    setGymBadge: async (parent, args, { req }) => {
      const perms = req.user ? req.user.perms : false
      if (perms?.gymBadges && req?.user?.id) {
        if (await Badge.query().where('gymId', args.gymId).andWhere('userId', req.user.id).first()) {
          await Badge.query().where('gymId', args.gymId).andWhere('userId', req.user.id)
            .update({ badge: args.badge })
        } else {
          await Badge.query().insert({
            badge: args.badge,
            gymId: args.gymId,
            userId: req.user.id,
          })
        }
        return true
      }
      return false
    },
  },
}
