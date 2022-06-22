/* eslint-disable no-console */
const GraphQLJSON = require('graphql-type-json')
const { AuthenticationError, UserInputError } = require('apollo-server-core')

const config = require('../services/config')
const { User, Badge } = require('../models/index')
const Utility = require('../services/Utility')
const Fetch = require('../services/Fetch')

module.exports = {
  JSON: GraphQLJSON,
  Query: {
    available: (_, args, { req, Event, Db, perms, version }) => {
      if (req.headers['apollographql-client-version'] !== version)
        throw new UserInputError('old_client')
      if (!perms) throw new AuthenticationError('session_expired')
      const available = {
        pokemon: perms.pokemon ? Event.available.pokemon : [],
        gyms: perms.gyms ? Event.available.gyms : [],
        nests: perms.nests ? Event.available.nests : [],
        pokestops: perms.pokestops ? Event.available.pokestops : [],
        questConditions: perms.quests ? Db.questConditions : {},
      }
      return {
        ...available,
        masterfile: { ...Event.masterfile, invasions: Event.invasions },
        filters: Utility.buildDefaultFilters(perms, available),
      }
    },
    badges: async (_, args, { req, perms, Db, version }) => {
      if (req.headers['apollographql-client-version'] !== version)
        throw new UserInputError('old_client')
      if (!perms) throw new AuthenticationError('session_expired')

      if (perms?.gymBadges) {
        const badges = await Badge.getAll(req.user?.id)
        return Db.getAll('Gym', badges, {}, req.user?.id, 'getBadges')
      }
      return []
    },
    devices: (_, args, { req, perms, Db, version }) => {
      if (req.headers['apollographql-client-version'] !== version)
        throw new UserInputError('old_client')
      if (!perms) throw new AuthenticationError('session_expired')

      if (perms?.devices) {
        return Db.getAll('Device', perms, args)
      }
      return []
    },
    geocoder: (_, args, { req, perms, version, Event }) => {
      if (req.headers['apollographql-client-version'] !== version)
        throw new UserInputError('old_client')
      if (!perms) throw new AuthenticationError('session_expired')

      if (perms?.webhooks) {
        const webhook = Event.webhookObj[args.name]
        if (webhook) {
          return Utility.geocoder(webhook.server.nominatimUrl, args.search)
        }
      }
      return []
    },
    gyms: (_, args, { req, perms, version, Db }) => {
      if (req.headers['apollographql-client-version'] !== version)
        throw new UserInputError('old_client')
      if (!perms) throw new AuthenticationError('session_expired')

      if (perms?.gyms || perms?.raids) {
        return Db.getAll('Gym', perms, args, req?.user?.id)
      }
      return []
    },
    gymsSingle: (_, args, { req, perms, version, Db }) => {
      if (req.headers['apollographql-client-version'] !== version)
        throw new UserInputError('old_client')
      if (!perms) throw new AuthenticationError('session_expired')

      if (perms?.[args.perm]) {
        return Db.getOne('Gym', args.id)
      }
      return {}
    },
    nests: (_, args, { req, perms, version, Db }) => {
      if (req.headers['apollographql-client-version'] !== version)
        throw new UserInputError('old_client')
      if (!perms) throw new AuthenticationError('session_expired')

      if (perms?.nests) {
        return Db.getAll('Nest', perms, args)
      }
      return []
    },
    nestsSingle: (_, args, { req, perms, version, Db }) => {
      if (req.headers['apollographql-client-version'] !== version)
        throw new UserInputError('old_client')
      if (!perms) throw new AuthenticationError('session_expired')

      if (perms?.[args.perm]) {
        return Db.getOne('Nest', args.id)
      }
      return {}
    },
    pokestops: (_, args, { req, perms, version, Db }) => {
      if (req.headers['apollographql-client-version'] !== version)
        throw new UserInputError('old_client')
      if (!perms) throw new AuthenticationError('session_expired')

      if (
        perms?.pokestops ||
        perms?.lures ||
        perms?.quests ||
        perms?.invasions
      ) {
        return Db.getAll('Pokestop', perms, args)
      }
      return []
    },
    pokestopsSingle: (_, args, { req, perms, version, Db }) => {
      if (req.headers['apollographql-client-version'] !== version)
        throw new UserInputError('old_client')
      if (!perms) throw new AuthenticationError('session_expired')

      if (perms?.[args.perm]) {
        return Db.getOne('Pokestop', args.id)
      }
      return {}
    },
    pokemon: (_, args, { req, perms, version, Db }) => {
      if (req.headers['apollographql-client-version'] !== version)
        throw new UserInputError('old_client')
      if (!perms) throw new AuthenticationError('session_expired')

      if (perms?.pokemon) {
        if (args.filters.onlyLegacy) {
          return Db.getAll('Pokemon', perms, args, 0, 'getLegacy')
        }
        return Db.getAll('Pokemon', perms, args)
      }
      return []
    },
    pokemonSingle: (_, args, { req, perms, version, Db }) => {
      if (req.headers['apollographql-client-version'] !== version)
        throw new UserInputError('old_client')
      if (!perms) throw new AuthenticationError('session_expired')

      if (perms?.[args.perm]) {
        return Db.getOne('Pokemon', args.id)
      }
      return {}
    },
    portals: (_, args, { req, perms, version, Db }) => {
      if (req.headers['apollographql-client-version'] !== version)
        throw new UserInputError('old_client')
      if (!perms) throw new AuthenticationError('session_expired')

      if (perms?.portals) {
        return Db.getAll('Portal', perms, args)
      }
      return []
    },
    portalsSingle: (_, args, { req, perms, version, Db }) => {
      if (req.headers['apollographql-client-version'] !== version)
        throw new UserInputError('old_client')
      if (!perms) throw new AuthenticationError('session_expired')

      if (perms?.[args.perm]) {
        return Db.getOne('Portal', args.id)
      }
      return {}
    },
    scanCells: (_, args, { req, perms, version, Db }) => {
      if (req.headers['apollographql-client-version'] !== version)
        throw new UserInputError('old_client')
      if (!perms) throw new AuthenticationError('session_expired')

      if (perms?.scanCells && args.zoom >= config.map.scanCellsZoom) {
        return Db.getAll('ScanCell', perms, args)
      }
      return []
    },
    scanAreas: (_, args, { req, perms, version }) => {
      if (req.headers['apollographql-client-version'] !== version)
        throw new UserInputError('old_client')
      if (!perms) throw new AuthenticationError('session_expired')

      const scanAreas = config.scanAreas[req.headers.host]
        ? config.scanAreas[req.headers.host]
        : config.scanAreas.main
      if (perms?.scanAreas && scanAreas.features.length) {
        return [
          {
            ...scanAreas,
            features: scanAreas.features.filter(
              (feature) =>
                !perms.areaRestrictions.length ||
                perms.areaRestrictions.includes(feature.properties.name),
            ),
          },
        ]
      }
      return [{ features: [] }]
    },
    scanAreasMenu: (_, args, { req, perms, version }) => {
      if (req.headers['apollographql-client-version'] !== version)
        throw new UserInputError('old_client')
      if (!perms) throw new AuthenticationError('session_expired')

      const scanAreas = config.scanAreasMenu[req.headers.host]
        ? config.scanAreasMenu[req.headers.host]
        : config.scanAreasMenu.main
      if (perms?.scanAreas && scanAreas.length) {
        if (perms.areaRestrictions.length) {
          const filtered = scanAreas
            .map((parent) => ({
              ...parent,
              children: parent.children.filter((child) =>
                perms.areaRestrictions.includes(child.properties.name),
              ),
            }))
            .filter((parent) => parent.children.length)

          filtered.forEach(({ children }) => {
            if (children.length % 2 === 1) {
              children.push({ type: 'Feature', properties: { name: '' } })
            }
          })

          return filtered
        }
        return scanAreas
      }
      return []
    },
    search: async (_, args, { req, Event, perms, version, Db }) => {
      if (req.headers['apollographql-client-version'] !== version)
        throw new UserInputError('old_client')
      if (!perms) throw new AuthenticationError('session_expired')

      const { category, webhookName, search } = args
      if (perms?.[category] && /^[0-9\s\p{L}]+$/u.test(search)) {
        if (!search || !search.trim()) {
          return []
        }
        switch (args.category) {
          case 'pokestops':
            return Db.search('Pokestop', perms, args)
          case 'raids':
            return Db.search('Gym', perms, args, 'searchRaids')
          case 'gyms': {
            const results = await Db.search('Gym', perms, args)
            const webhook = webhookName ? Event.webhookObj[webhookName] : null
            if (webhook && results.length) {
              const withFormatted = await Promise.all(
                results.map(async (result) => ({
                  ...result,
                  formatted: await Utility.geocoder(
                    webhook.server.nominatimUrl,
                    { lat: result.lat, lon: result.lon },
                    true,
                  ),
                })),
              )
              return withFormatted
            }
            return results
          }
          case 'portals':
            return Db.search('Portal', perms, args)
          case 'nests':
            return Db.search('Nest', perms, args)
          default:
            return []
        }
      }
      return []
    },
    searchQuest: (_, args, { req, perms, version, Db }) => {
      if (req.headers['apollographql-client-version'] !== version)
        throw new UserInputError('old_client')
      if (!perms) throw new AuthenticationError('session_expired')

      const { category, search } = args
      if (perms?.[category] && /^[0-9\s\p{L}]+$/u.test(search)) {
        if (!search || !search.trim()) {
          return []
        }
        return Db.search('Pokestop', perms, args, 'searchQuests')
      }
      return []
    },
    spawnpoints: (_, args, { req, perms, version, Db }) => {
      if (req.headers['apollographql-client-version'] !== version)
        throw new UserInputError('old_client')
      if (!perms) throw new AuthenticationError('session_expired')

      if (perms?.spawnpoints) {
        return Db.getAll('Spawnpoint', perms, args)
      }
      return []
    },
    submissionCells: async (_, args, { req, perms, version, Db }) => {
      if (req.headers['apollographql-client-version'] !== version)
        throw new UserInputError('old_client')
      if (!perms) throw new AuthenticationError('session_expired')

      if (
        perms?.submissionCells &&
        args.zoom >= config.map.submissionZoom - 1
      ) {
        const [pokestops, gyms] = await Db.submissionCells(perms, args)
        return [
          {
            placementCells:
              args.zoom >= config.map.submissionZoom
                ? Utility.getPlacementCells(args, pokestops, gyms)
                : [],
            typeCells: Utility.getTypeCells(args, pokestops, gyms),
          },
        ]
      }
      return [{ placementCells: [], typeCells: [] }]
    },
    weather: (_, args, { req, perms, version, Db }) => {
      if (req.headers['apollographql-client-version'] !== version)
        throw new UserInputError('old_client')
      if (!perms) throw new AuthenticationError('session_expired')

      if (perms?.weather) {
        return Db.getAll('Weather', perms, args)
      }
      return []
    },
    webhook: (_, args, { req, perms, version }) => {
      if (req.headers['apollographql-client-version'] !== version)
        throw new UserInputError('old_client')
      if (!perms) throw new AuthenticationError('session_expired')

      if (perms?.webhooks) {
        return Fetch.webhookApi(
          args.category,
          Utility.evalWebhookId(req.user),
          args.status,
          args.name,
        )
      }
      return {}
    },
    scanner: (_, args, { req, perms, version }) => {
      if (req.headers['apollographql-client-version'] !== version)
        throw new UserInputError('old_client')
      if (!perms) throw new AuthenticationError('session_expired')

      const { category, method, data } = args
      if (category === 'getQueue') {
        return Fetch.scannerApi(category, method, data)
      }
      if (perms?.scanner?.includes(category)) {
        return Fetch.scannerApi(category, method, data)
      }
      return {}
    },
  },
  Mutation: {
    webhook: (_, args, { req }) => {
      const perms = req.user ? req.user.perms : false
      const { category, data, status, name } = args
      if (perms?.webhooks?.includes(name)) {
        return Fetch.webhookApi(
          category,
          Utility.evalWebhookId(req.user),
          status,
          name,
          data,
        )
      }
      return {}
    },
    tutorial: async (_, args, { req }) => {
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
    strategy: async (_, args, { req }) => {
      if (req.user) {
        await User.query()
          .update({ webhookStrategy: args.strategy })
          .where('id', req.user.id)
        return true
      }
      return false
    },
    checkUsername: async (_, args) => {
      const results = await User.query().where('username', args.username)
      return Boolean(results.length)
    },
    setGymBadge: async (_, args, { req }) => {
      const perms = req.user ? req.user.perms : false
      if (perms?.gymBadges && req?.user?.id) {
        if (
          await Badge.query()
            .where('gymId', args.gymId)
            .andWhere('userId', req.user.id)
            .first()
        ) {
          await Badge.query()
            .where('gymId', args.gymId)
            .andWhere('userId', req.user.id)
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
