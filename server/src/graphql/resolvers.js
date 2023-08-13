/* global BigInt */
const { GraphQLJSON } = require('graphql-type-json')
const { S2LatLng, S2RegionCoverer, S2LatLngRect } = require('nodes2ts')
const config = require('config')

const Utility = require('../services/Utility')
const Fetch = require('../services/Fetch')
const buildDefaultFilters = require('../services/filters/builder/base')
const filterComponents = require('../services/functions/filterComponents')
const { filterRTree } = require('../services/functions/filterRTree')
const evalWebhookId = require('../services/functions/evalWebhookId')

/** @type {import("@apollo/server").ApolloServerOptions<import('../types').GqlContext>['resolvers']} */
const resolvers = {
  JSON: GraphQLJSON,
  Query: {
    available: (_, _args, { Event, Db, perms }) => {
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
        filters: buildDefaultFilters(perms, available, Db),
      }
    },
    backup: (_, args, { req, perms, Db }) => {
      if (perms?.backups && req?.user?.id) {
        return Db.models.Backup.getOne(args.id, req?.user?.id)
      }
      return {}
    },
    backups: (_, _args, { req, perms, Db }) => {
      if (perms?.backups) {
        return Db.models.Backup.getAll(req.user?.id)
      }
      return []
    },
    badges: async (_, _args, { req, perms, Db }) => {
      if (perms?.gymBadges) {
        const badges = await Db.query('Badge', 'getAll', req.user?.id)
        const gyms = await Db.query('Gym', 'getBadges', badges)
        return gyms
      }
      return []
    },
    checkUsername: async (_, args, { Db }) => {
      const results = await Db.models.User.query().where(
        'username',
        args.username,
      )
      return !!results.length
    },
    checkValidScan: (_, { mode, points }, { perms }) => {
      if (perms?.scanner.includes(mode)) {
        const areaRestrictions =
          config.get(`scanner.${mode}.${mode}AreaRestriction`) || []

        const validPoints = points.map((point) =>
          filterRTree(
            { lat: point[0], lon: point[1] },
            perms.areaRestrictions,
            areaRestrictions,
          ),
        )
        return validPoints
      }
      return []
    },
    fabButtons: (_, _args, { perms, user, req, Event }) => {
      const domain = `multiDomainsObj[${req.headers.host}]`

      /** @type {import('../types').Config['map']['donationPage']} */
      const donorPage = config.has(domain)
        ? config.get(`${domain}.donationPage`)
        : config.get('map.donationPage')

      /** @type {import('../types').Config['scanner']} */
      const scanner = config.get('scanner')

      return {
        custom: config.has(domain)
          ? config.get(`${domain}.customFloatingIcons`)
          : config.get('map.customFloatingIcons'),
        donationButton:
          donorPage.showOnMap && (perms.donor ? donorPage.showToDonors : true)
            ? donorPage.fabIcon
            : '',
        profileButton:
          user && config.has(domain)
            ? config.get(`${domain}.enableFloatingProfileButton`)
            : config.get('map.enableFloatingProfileButton'),
        scanZone:
          scanner.backendConfig.platform !== 'mad' &&
          scanner.scanZone.enabled &&
          perms.scanner.includes('scanZone'),
        scanNext:
          scanner.scanNext.enabled && perms.scanner.includes('scanNext'),
        search: Object.entries(config.api.searchable).some(
          ([k, v]) => v && perms[k],
        ),
        webhooks:
          !!perms.webhooks.length &&
          perms.webhooks.every((name) => name in Event.webhookObj),
      }
    },
    customComponent: (_, { component }, { perms, user }) => {
      switch (component) {
        case 'messageOfTheDay':
        case 'donationPage':
        case 'loginPage':
          if (config.has(`map.${component}`)) {
            const {
              footerButtons = [],
              components = [],
              ...rest
            } = config.get(`map.${component}`)
            return {
              ...rest,
              footerButtons: filterComponents(
                footerButtons,
                !!user,
                perms.donor,
              ),
              components: filterComponents(components, !!user, perms.donor),
            }
          }
          return null
        default:
          return null
      }
    },
    devices: (_, args, { perms, Db }) => {
      if (perms?.devices) {
        return Db.getAll('Device', perms, args)
      }
      return []
    },
    geocoder: (_, args, { perms, Event }) => {
      if (perms?.webhooks) {
        const webhook = Event.webhookObj[args.name]
        if (webhook) {
          return Utility.geocoder(webhook.server.nominatimUrl, args.search)
        }
      }
      return []
    },
    gyms: (_, args, { req, perms, Db }) => {
      if (perms?.gyms || perms?.raids) {
        return Db.getAll('Gym', perms, args, req?.user?.id)
      }
      return []
    },
    gymsSingle: (_, args, { perms, Db }) => {
      if (perms?.[args.perm]) {
        return Db.getOne('Gym', args.id)
      }
      return {}
    },
    motdCheck: (_, { clientIndex }, { perms }) => {
      const motd = config.get('map.messageOfTheDay')
      return (
        (motd.index > clientIndex || motd.settings.permanent) &&
        ((perms.donor
          ? motd.settings.donorOnly
          : motd.settings.freeloaderOnly) ||
          (!motd.settings.donorOnly && !motd.settings.freeloaderOnly))
      )
    },
    nests: (_, args, { perms, Db }) => {
      if (perms?.nests) {
        return Db.getAll('Nest', perms, args)
      }
      return []
    },
    nestsSingle: (_, args, { perms, Db }) => {
      if (perms?.[args.perm]) {
        return Db.getOne('Nest', args.id)
      }
      return {}
    },
    pokestops: (_, args, { perms, Db }) => {
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
    pokestopsSingle: (_, args, { perms, Db }) => {
      if (perms?.[args.perm]) {
        return Db.getOne('Pokestop', args.id)
      }
      return {}
    },
    pokemon: (_, args, { perms, Db }) => {
      if (perms?.pokemon) {
        if (args.filters.onlyLegacy) {
          return Db.query('Pokemon', 'getLegacy', perms, args)
        }
        return Db.query('Pokemon', 'getAll', perms, args)
      }
      return []
    },
    pokemonSingle: (_, args, { perms, Db }) => {
      if (perms?.[args.perm]) {
        return Db.getOne('Pokemon', args.id)
      }
      return {}
    },
    portals: (_, args, { perms, Db }) => {
      if (perms?.portals) {
        return Db.getAll('Portal', perms, args)
      }
      return []
    },
    portalsSingle: (_, args, { perms, Db }) => {
      if (perms?.[args.perm]) {
        return Db.getOne('Portal', args.id)
      }
      return {}
    },
    route: (_, args, { perms, Db }) => {
      if (perms?.routes) {
        return Db.query('Route', 'getOne', args.id)
      }
      return {}
    },
    routes: (_, args, { perms, Db }) => {
      if (perms?.routes) {
        return Db.query('Route', 'getAll', perms, args)
      }
      return []
    },
    s2cells: (_, args, { perms }) => {
      if (perms?.s2cells) {
        const { onlyCells } = args.filters
        return onlyCells.flatMap((level) => {
          const regionCoverer = new S2RegionCoverer()
          const region = S2LatLngRect.fromLatLng(
            S2LatLng.fromDegrees(args.minLat, args.minLon),
            S2LatLng.fromDegrees(args.maxLat, args.maxLon),
          )
          regionCoverer.setMinLevel(level)
          regionCoverer.setMaxLevel(level)
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
    scanCells: (_, args, { perms, Db }) => {
      if (perms?.scanCells && args.zoom >= config.get('map.scanCellsZoom')) {
        return Db.getAll('ScanCell', perms, args)
      }
      return []
    },
    scanAreas: (_, _args, { req, perms }) => {
      if (perms?.scanAreas) {
        const scanAreas = config.has(`areas.scanAreas.${req.headers.host}`)
          ? config.get(`areas.scanAreas.${req.headers.host}`)
          : config.get('areas.scanAreas.main')
        return [
          {
            ...scanAreas,
            features: scanAreas.features.filter(
              (feature) =>
                !feature.properties.hidden &&
                (!perms.areaRestrictions.length ||
                  perms.areaRestrictions.includes(feature.properties.name) ||
                  perms.areaRestrictions.includes(feature.properties.parent)),
            ),
          },
        ]
      }
      return [{ features: [] }]
    },
    scanAreasMenu: (_, _args, { req, perms }) => {
      if (perms?.scanAreas) {
        const scanAreas = config.has(`areas.scanAreasMenu.${req.headers.host}`)
          ? config.get(`areas.scanAreasMenu.${req.headers.host}`)
          : config.get('areas.scanAreasMenu.main')

        if (perms.areaRestrictions.length) {
          const filtered = scanAreas
            .map((parent) => ({
              ...parent,
              children: perms.areaRestrictions.includes(parent.name)
                ? parent.children
                : parent.children.filter((child) =>
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
                  manual: !!config.get('manualAreas.length'),
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
    scannerConfig: (_, { mode }, { perms }) => {
      /** @type {import('../types').Config['scanner']} */
      const scanner = config.get('scanner')

      if (perms.scanner?.includes(mode) && scanner[mode].enabled) {
        return mode === 'scanZone'
          ? {
              scannerType: scanner.backendConfig.platform,
              showScanCount: scanner.scanZone.showScanCount,
              showScanQueue: scanner.scanZone.showScanQueue,
              advancedOptions: scanner.scanZone.advancedScanZoneOptions,
              pokemonRadius: scanner.scanZone.scanZoneRadius.pokemon,
              gymRadius: scanner.scanZone.scanZoneRadius.gym,
              spacing: scanner.scanZone.scanZoneSpacing,
              maxSize: scanner.scanZone.scanZoneMaxSize,
              cooldown: scanner.scanZone.userCooldownSeconds,
              refreshQueue: scanner.backendConfig.queueRefreshInterval,
              enabled: scanner[mode].enabled,
            }
          : {
              showScanCount: scanner.scanNext.showScanCount,
              showScanQueue: scanner.scanNext.showScanQueue,
              cooldown: scanner.scanNext.userCooldownSeconds,
              refreshQueue: scanner.backendConfig.queueRefreshInterval,
              enabled: scanner[mode].enabled,
            }
      }
      return null
    },
    search: async (_, args, { Event, perms, Db }) => {
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
    searchLure: (_, args, { perms, Db }) => {
      const { category, search } = args
      if (perms?.[category] && /^[0-9\s\p{L}]+$/u.test(search)) {
        if (!search || !search.trim()) {
          return []
        }
        return Db.search('Pokestop', perms, args, 'searchLures')
      }
      return []
    },
    searchQuest: (_, args, { perms, Db }) => {
      const { category, search } = args
      if (perms?.[category] && /^[0-9\s\p{L}]+$/u.test(search)) {
        if (!search || !search.trim()) {
          return []
        }
        return Db.search('Pokestop', perms, args, 'searchQuests')
      }
      return []
    },
    searchable: (_, __, { perms }) => {
      const options = config.get('api.searchable')
      return Object.keys(options).filter((k) => options[k] && perms[k])
    },
    spawnpoints: (_, args, { perms, Db }) => {
      if (perms?.spawnpoints) {
        return Db.getAll('Spawnpoint', perms, args)
      }
      return []
    },
    submissionCells: async (_, args, { perms, Db }) => {
      if (
        perms?.submissionCells &&
        args.zoom >= config.get('map.submissionZoom') - 1
      ) {
        const [pokestops, gyms] = await Db.submissionCells(perms, args)
        return [
          {
            placementCells:
              args.zoom >= config.get('map.submissionZoom')
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
    weather: (_, args, { perms, Db }) => {
      if (perms?.weather) {
        return Db.getAll('Weather', perms, args)
      }
      return []
    },
    webhook: (_, args, { req, perms }) => {
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
    webhookAreas: async (_, { name }, { req, perms, Db }) => {
      if (perms.webhooks.includes(name) && req.user?.id) {
        const user = await Db.query('User', 'getOne', req.user.id)
        const { areas } = await Fetch.webhookApi(
          'humans',
          evalWebhookId(user),
          'GET',
          name,
        )
        const areaGroups = areas.reduce((groupMap, area) => {
          if (area.userSelectable) {
            if (!groupMap[area.group]) groupMap[area.group] = []
            groupMap[area.group].push(area.name)
          }
          return groupMap
        }, {})

        return Object.entries(areaGroups).map(([group, children]) => ({
          group,
          children,
        }))
      }
      return []
    },
    webhookGeojson: async (parent, { name }, { perms }) => {
      console.log({ parent })
    },
    scanner: (_, args, { req, perms }) => {
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
      if (perms?.backups && req.user?.id) {
        await Db.models.Backup.create(args.backup, req.user.id)
      }
    },
    deleteBackup: async (_, args, { req, perms, Db }) => {
      if (perms?.backups && req.user?.id) {
        await Db.models.Backup.delete(args.id, req.user.id)
      }
    },
    updateBackup: async (_, args, { req, perms, Db }) => {
      if (perms?.backups && req.user?.id) {
        await Db.models.Backup.update(args.backup, req.user.id)
      }
    },
    nestSubmission: async (_, args, { req, perms, Db, user }) => {
      if (perms?.nestSubmissions && req.user?.id) {
        return Db.query(
          'NestSubmission',
          'create',
          {
            name: args.name,
            nest_id: args.id,
          },
          {
            submitted_by: user,
            user_id: req.user.id,
          },
        )
      }
      return false
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

module.exports = resolvers
