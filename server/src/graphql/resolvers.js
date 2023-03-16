/* eslint-disable no-console */
/* global BigInt */
const GraphQLJSON = require('graphql-type-json')
const { AuthenticationError, UserInputError } = require('apollo-server-core')
const { S2LatLng, S2RegionCoverer, S2LatLngRect } = require('nodes2ts')

const config = require('../services/config')
const Utility = require('../services/Utility')
const Fetch = require('../services/Fetch')

module.exports = {
  JSON: GraphQLJSON,
  Query: {
    available: (_, _args, { Event, Db, perms, serverV, clientV }) => {
      if (clientV && serverV && clientV !== serverV)
        throw new UserInputError('old_client', { clientV, serverV })
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
        filters: Utility.buildDefaultFilters(perms, available, Db.models),
      }
    },
    backup: (_, args, { req, perms, Db, serverV, clientV }) => {
      if (clientV && serverV && clientV !== serverV)
        throw new UserInputError('old_client', { clientV, serverV })
      if (!perms) throw new AuthenticationError('session_expired')
      if (perms?.backups && req?.user?.id) {
        return Db.models.Backup.getOne(args.id, req?.user?.id)
      }
      return {}
    },
    backups: (_, _args, { req, perms, Db, serverV, clientV }) => {
      if (clientV && serverV && clientV !== serverV)
        throw new UserInputError('old_client', { clientV, serverV })
      if (!perms) throw new AuthenticationError('session_expired')
      if (perms?.backups) {
        return Db.models.Backup.getAll(req.user?.id)
      }
      return []
    },
    badges: async (_, _args, { req, perms, Db, serverV, clientV }) => {
      if (clientV && serverV && clientV !== serverV)
        throw new UserInputError('old_client', { clientV, serverV })
      if (!perms) throw new AuthenticationError('session_expired')

      if (perms?.gymBadges) {
        const badges = await Db.models.Badge.getAll(req.user?.id)
        return Db.getAll('Gym', badges, {}, req.user?.id, 'getBadges')
      }
      return []
    },
    devices: (_, args, { perms, Db, serverV, clientV }) => {
      if (clientV && serverV && clientV !== serverV)
        throw new UserInputError('old_client', { clientV, serverV })
      if (!perms) throw new AuthenticationError('session_expired')

      if (perms?.devices) {
        return Db.getAll('Device', perms, args)
      }
      return []
    },
    geocoder: (_, args, { perms, serverV, clientV, Event }) => {
      if (clientV && serverV && clientV !== serverV)
        throw new UserInputError('old_client', { clientV, serverV })
      if (!perms) throw new AuthenticationError('session_expired')

      if (perms?.webhooks) {
        const webhook = Event.webhookObj[args.name]
        if (webhook) {
          return Utility.geocoder(webhook.server.nominatimUrl, args.search)
        }
      }
      return []
    },
    gyms: (_, args, { req, perms, serverV, clientV, Db }) => {
      if (clientV && serverV && clientV !== serverV)
        throw new UserInputError('old_client', { clientV, serverV })
      if (!perms) throw new AuthenticationError('session_expired')

      if (perms?.gyms || perms?.raids) {
        return Db.getAll('Gym', perms, args, req?.user?.id)
      }
      return []
    },
    gymsSingle: (_, args, { perms, serverV, clientV, Db }) => {
      if (clientV && serverV && clientV !== serverV)
        throw new UserInputError('old_client', { clientV, serverV })
      if (!perms) throw new AuthenticationError('session_expired')

      if (perms?.[args.perm]) {
        return Db.getOne('Gym', args.id)
      }
      return {}
    },
    nests: (_, args, { perms, serverV, clientV, Db }) => {
      if (clientV && serverV && clientV !== serverV)
        throw new UserInputError('old_client', { clientV, serverV })
      if (!perms) throw new AuthenticationError('session_expired')

      if (perms?.nests) {
        return Db.getAll('Nest', perms, args)
      }
      return []
    },
    nestsSingle: (_, args, { perms, serverV, clientV, Db }) => {
      if (clientV && serverV && clientV !== serverV)
        throw new UserInputError('old_client', { clientV, serverV })
      if (!perms) throw new AuthenticationError('session_expired')

      if (perms?.[args.perm]) {
        return Db.getOne('Nest', args.id)
      }
      return {}
    },
    pokestops: (_, args, { perms, serverV, clientV, Db }) => {
      if (clientV && serverV && clientV !== serverV)
        throw new UserInputError('old_client', { clientV, serverV })
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
    pokestopsSingle: (_, args, { perms, serverV, clientV, Db }) => {
      if (clientV && serverV && clientV !== serverV)
        throw new UserInputError('old_client', { clientV, serverV })
      if (!perms) throw new AuthenticationError('session_expired')

      if (perms?.[args.perm]) {
        return Db.getOne('Pokestop', args.id)
      }
      return {}
    },
    pokemon: (_, args, { perms, serverV, clientV, Db }) => {
      if (clientV && serverV && clientV !== serverV)
        throw new UserInputError('old_client', { clientV, serverV })
      if (!perms) throw new AuthenticationError('session_expired')

      if (perms?.pokemon) {
        if (args.filters.onlyLegacy) {
          return Db.getAll('Pokemon', perms, args, 0, 'getLegacy')
        }
        return Db.getAll('Pokemon', perms, args)
      }
      return []
    },
    pokemonSingle: (_, args, { perms, serverV, clientV, Db }) => {
      if (clientV && serverV && clientV !== serverV)
        throw new UserInputError('old_client', { clientV, serverV })
      if (!perms) throw new AuthenticationError('session_expired')

      if (perms?.[args.perm]) {
        return Db.getOne('Pokemon', args.id)
      }
      return {}
    },
    portals: (_, args, { perms, serverV, clientV, Db }) => {
      if (clientV && serverV && clientV !== serverV)
        throw new UserInputError('old_client', { clientV, serverV })
      if (!perms) throw new AuthenticationError('session_expired')

      if (perms?.portals) {
        return Db.getAll('Portal', perms, args)
      }
      return []
    },
    portalsSingle: (_, args, { perms, serverV, clientV, Db }) => {
      if (clientV && serverV && clientV !== serverV)
        throw new UserInputError('old_client', { clientV, serverV })
      if (!perms) throw new AuthenticationError('session_expired')

      if (perms?.[args.perm]) {
        return Db.getOne('Portal', args.id)
      }
      return {}
    },
    s2cells: (_, args, { perms, serverV, clientV }) => {
      if (clientV && serverV && clientV !== serverV)
        throw new UserInputError('old_client', { clientV, serverV })
      if (!perms) throw new AuthenticationError('session_expired')
      if (perms?.s2cells) {
        const { onlyCells } = args.filters
        return onlyCells.flatMap((level) => {
          const regionCoverer = new S2RegionCoverer()
          const region = S2LatLngRect.fromLatLng(
            S2LatLng.fromDegrees(args.minLat, args.minLon),
            S2LatLng.fromDegrees(args.maxLat, args.maxLon),
          )
          regionCoverer.minLevel = level
          regionCoverer.maxLevel = level
          return regionCoverer.getCoveringCells(region).map((cell) => {
            const id = BigInt(cell.id).toString()
            return {
              id,
              coords: Utility.getPolyVector(id).poly,
            }
          })
        })
      }
      return []
    },
    scanCells: (_, args, { perms, serverV, clientV, Db }) => {
      if (clientV && serverV && clientV !== serverV)
        throw new UserInputError('old_client', { clientV, serverV })
      if (!perms) throw new AuthenticationError('session_expired')

      if (perms?.scanCells && args.zoom >= config.map.scanCellsZoom) {
        return Db.getAll('ScanCell', perms, args)
      }
      return []
    },
    scanAreas: (_, _args, { req, perms, serverV, clientV }) => {
      if (clientV && serverV && clientV !== serverV)
        throw new UserInputError('old_client', { clientV, serverV })
      if (!perms) throw new AuthenticationError('session_expired')

      if (perms?.scanAreas) {
        const scanAreas = config.areas.scanAreas[req.headers.host]
          ? config.areas.scanAreas[req.headers.host]
          : config.areas.scanAreas.main
        return [
          {
            ...scanAreas,
            features: scanAreas.features.filter(
              (feature) =>
                !feature.properties.hidden &&
                (!perms.areaRestrictions.length ||
                  perms.areaRestrictions.includes(feature.properties.name)),
            ),
          },
        ]
      }
      return [{ features: [] }]
    },
    scanAreasMenu: (_, _args, { req, perms, serverV, clientV }) => {
      if (clientV && serverV && clientV !== serverV)
        throw new UserInputError('old_client', { clientV, serverV })
      if (!perms) throw new AuthenticationError('session_expired')

      if (perms?.scanAreas) {
        const scanAreas = config.areas.scanAreasMenu[req.headers.host]
          ? config.areas.scanAreasMenu[req.headers.host]
          : config.areas.scanAreasMenu.main

        if (perms.areaRestrictions.length) {
          const filtered = scanAreas
            .map((parent) => ({
              ...parent,
              children: parent.children.filter((child) =>
                perms.areaRestrictions.includes(child.properties.name),
              ),
            }))
            .filter((parent) => parent.children.length)

          // Adds new blanks to account for area restrictions trimming some
          filtered.forEach(({ children }) => {
            if (children.length % 2 === 1) {
              children.push({
                type: 'Feature',
                properties: {
                  name: '',
                  manual: Boolean(config.manualAreas.length),
                },
              })
            }
          })
          return filtered
        }
        return scanAreas.filter((parent) => parent.children.length)
      }
      return []
    },
    search: async (_, args, { Event, perms, serverV, clientV, Db }) => {
      if (clientV && serverV && clientV !== serverV)
        throw new UserInputError('old_client', { clientV, serverV })
      if (!perms) throw new AuthenticationError('session_expired')

      const { category, webhookName, search } = args
      if (perms?.[category] && /^[0-9\s\p{L}]+$/u.test(search)) {
        if (!search || !search.trim()) {
          return []
        }
        switch (args.category) {
          case 'pokemon':
            return Db.search('Pokemon', perms, args)
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
    searchLure: (_, args, { perms, serverV, clientV, Db }) => {
      if (clientV && serverV && clientV !== serverV)
        throw new UserInputError('old_client', { clientV, serverV })
      if (!perms) throw new AuthenticationError('session_expired')

      const { category, search } = args
      if (perms?.[category] && /^[0-9\s\p{L}]+$/u.test(search)) {
        if (!search || !search.trim()) {
          return []
        }
        return Db.search('Pokestop', perms, args, 'searchLures')
      }
      return []
    },
    searchQuest: (_, args, { perms, serverV, clientV, Db }) => {
      if (clientV && serverV && clientV !== serverV)
        throw new UserInputError('old_client', { clientV, serverV })
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
    spawnpoints: (_, args, { perms, serverV, clientV, Db }) => {
      if (clientV && serverV && clientV !== serverV)
        throw new UserInputError('old_client', { clientV, serverV })
      if (!perms) throw new AuthenticationError('session_expired')

      if (perms?.spawnpoints) {
        return Db.getAll('Spawnpoint', perms, args)
      }
      return []
    },
    submissionCells: async (_, args, { perms, serverV, clientV, Db }) => {
      if (clientV && serverV && clientV !== serverV)
        throw new UserInputError('old_client', { clientV, serverV })
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
            typeCells: args.filters.onlyS14Cells
              ? Utility.getTypeCells(args, pokestops, gyms)
              : [],
          },
        ]
      }
      return [{ placementCells: [], typeCells: [] }]
    },
    weather: (_, args, { perms, serverV, clientV, Db }) => {
      if (clientV && serverV && clientV !== serverV)
        throw new UserInputError('old_client', { clientV, serverV })
      if (!perms) throw new AuthenticationError('session_expired')

      if (perms?.weather) {
        return Db.getAll('Weather', perms, args)
      }
      return []
    },
    webhook: (_, args, { req, perms, serverV, clientV }) => {
      if (clientV && serverV && clientV !== serverV)
        throw new UserInputError('old_client', { clientV, serverV })
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
    scanner: (_, args, { req, perms, serverV, clientV }) => {
      if (clientV && serverV && clientV !== serverV)
        throw new UserInputError('old_client', { clientV, serverV })
      if (!perms) throw new AuthenticationError('session_expired')

      const { category, method, data } = args
      if (category === 'getQueue') {
        return Fetch.scannerApi(category, method, data, req?.user)
      }
      if (perms?.scanner?.includes(category)) {
        return Fetch.scannerApi(category, method, data, req?.user)
      }
      return {}
    },
  },
  Mutation: {
    createBackup: async (_, args, { req, perms, Db }) => {
      if (!perms || req.user?.id === undefined)
        throw new AuthenticationError('session_expired')
      if (perms?.backups && req.user?.id) {
        await Db.models.Backup.create(args.backup, req.user.id)
      }
    },
    deleteBackup: async (_, args, { req, perms, Db }) => {
      if (!perms || req.user?.id === undefined)
        throw new AuthenticationError('session_expired')
      if (perms?.backups && req.user?.id) {
        await Db.models.Backup.delete(args.id, req.user.id)
      }
    },
    updateBackup: async (_, args, { req, perms, Db }) => {
      if (!perms || req.user?.id === undefined)
        throw new AuthenticationError('session_expired')
      if (perms?.backups && req.user?.id) {
        await Db.models.Backup.update(args.backup, req.user.id)
      }
    },
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
    tutorial: async (_, args, { req, Db }) => {
      if (req.user) {
        await Db.models.User.query()
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
    strategy: async (_, args, { req, Db }) => {
      if (req.user) {
        await Db.models.User.query()
          .update({ webhookStrategy: args.strategy })
          .where('id', req.user.id)
        return true
      }
      return false
    },
    checkUsername: async (_, args, { Db }) => {
      const results = await Db.models.User.query().where(
        'username',
        args.username,
      )
      return Boolean(results.length)
    },
    setExtraFields: async (_, { key, value }, { req, Db }) => {
      if (req.user?.id) {
        const user = await Db.models.User.query().findById(req.user.id)
        if (user) {
          const data =
            typeof user.data === 'string'
              ? JSON.parse(user.data)
              : user.data || {}
          data[key] = value
          await user.$query().update({ data: JSON.stringify(data) })
        }
        return true
      }
      return false
    },
    setGymBadge: async (_, args, { req, Db }) => {
      const perms = req.user ? req.user.perms : false
      if (perms?.gymBadges && req?.user?.id) {
        if (
          await Db.models.Badge.query()
            .where('gymId', args.gymId)
            .andWhere('userId', req.user.id)
            .first()
        ) {
          await Db.models.Badge.query()
            .where('gymId', args.gymId)
            .andWhere('userId', req.user.id)
            .update({ badge: args.badge })
        } else {
          await Db.models.Badge.query().insert({
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
