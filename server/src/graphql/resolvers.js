const fs = require('fs')
const { resolve } = require('path')
const { GraphQLJSON } = require('graphql-type-json')
const { S2LatLng, S2RegionCoverer, S2LatLngRect } = require('nodes2ts')
const config = require('@rm/config')

const buildDefaultFilters = require('../services/filters/builder/base')
const filterComponents = require('../services/functions/filterComponents')
const { filterRTree } = require('../services/functions/filterRTree')
const validateSelectedWebhook = require('../services/functions/validateSelectedWebhook')
const PoracleAPI = require('../services/api/Poracle')
const { geocoder } = require('../services/geocoder')
const scannerApi = require('../services/api/scannerApi')
const getPolyVector = require('../services/functions/getPolyVector')
const getPlacementCells = require('../services/functions/getPlacementCells')
const getTypeCells = require('../services/functions/getTypeCells')

/** @type {import("@apollo/server").ApolloServerOptions<import("@rm/types").GqlContext>['resolvers']} */
const resolvers = {
  JSON: GraphQLJSON,
  Query: {
    available: (_, _args, { Event, Db, perms }) => {
      const data = {
        pokemon: perms.pokemon ? Event.available.pokemon : [],
        gyms: perms.gyms ? Event.available.gyms : [],
        nests: perms.nests ? Event.available.nests : [],
        pokestops: perms.pokestops ? Event.available.pokestops : [],
        questConditions: perms.quests ? Db.questConditions : {},
        masterfile: { ...Event.masterfile, invasions: Event.invasions },
        filters: buildDefaultFilters(perms, Db),
        icons: {
          ...config.getSafe('icons'),
          styles: Event.uicons,
        },
      }
      return data
    },
    backup: (_, args, { req, perms, Db }) => {
      if (perms?.backups && req?.user?.id) {
        return Db.models.Backup.getOne(args.id, req?.user?.id)
      }
      return {}
    },
    backups: async (_, _args, { req, perms, Db }) => {
      if (perms?.backups) {
        const records = await Db.query('Backup', 'getAll', req.user?.id)
        return records
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
    /** @param {unknown} _ @param {{ mode: 'scanNext' | 'scanZone' }} args */
    checkValidScan: (_, { mode, points }, { perms }) => {
      if (perms?.scanner.includes(mode)) {
        const areaRestrictions =
          config.getSafe(`scanner.${mode}.${mode}AreaRestriction`) || []

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
    /** @param {unknown} _ @param {{ component: 'loginPage' | 'donationPage' | 'messageOfTheDay' }} args */
    customComponent: (_, { component }, { perms, req, user }) => {
      switch (component) {
        case 'messageOfTheDay':
        case 'donationPage':
        case 'loginPage':
          if (config.has(`map.${component}`)) {
            const {
              footerButtons = [],
              components = [],
              ...rest
            } = config.getMapConfig(req)[component]
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
        return Db.query('Device', 'getAll', perms, args)
      }
      return []
    },
    fabButtons: async (_, _args, { perms, user, req, Db, Event }) => {
      const { donationPage, misc } = config.getMapConfig(req)

      const scanner = config.getSafe('scanner')

      const selectedWebhook = await validateSelectedWebhook(req.user, Db, Event)
      if (selectedWebhook) {
        req.user.selectedWebhook = selectedWebhook
        req.session.save()
      }

      return {
        custom: misc.customFloatingIcons,
        donationButton:
          donationPage.showOnMap &&
          (perms.donor ? donationPage.showToDonors : true)
            ? donationPage.fabIcon
            : '',
        profileButton: !!(user && misc.enableFloatingProfileButton),
        scanZone:
          scanner.backendConfig.platform !== 'mad' &&
          scanner.scanZone.enabled &&
          perms.scanner.includes('scanZone'),
        scanNext:
          scanner.scanNext.enabled && perms.scanner.includes('scanNext'),
        search: Object.entries(config.getSafe('api.searchable')).some(
          ([k, v]) => v && perms[k],
        ),
        webhooks: !!selectedWebhook,
      }
    },
    geocoder: (_, { search }, { perms, Event, req }) => {
      if (perms?.webhooks) {
        const webhook = Event.webhookObj[req.user?.selectedWebhook]
        if (webhook) {
          return geocoder(
            webhook.nominatimUrl,
            search,
            false,
            webhook.addressFormat,
          )
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
    motdCheck: (_, { clientIndex }, { req, perms }) => {
      const motd = config.getMapConfig(req).messageOfTheDay
      return (
        motd.components.length &&
        (motd.index > clientIndex || motd.settings.permanent) &&
        ((perms.donor
          ? motd.settings.donorOnly
          : motd.settings.freeloaderOnly) ||
          (!motd.settings.donorOnly && !motd.settings.freeloaderOnly))
      )
    },
    nests: (_, args, { perms, Db }) => {
      if (perms?.nests) {
        return Db.query('Nest', 'getAll', perms, args)
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
        return Db.query('Pokestop', 'getAll', perms, args)
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
        return Db.query('Portal', 'getAll', perms, args)
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
            const id = cell.id.toString()
            return {
              id,
              coords: getPolyVector(id).polygon,
            }
          })
        })
      }
      return []
    },
    scanCells: (_, args, { perms, Db, req }) => {
      if (
        perms?.scanCells &&
        args.zoom >= config.getMapConfig(req).general.scanCellsZoom
      ) {
        return Db.query('ScanCell', 'getAll', perms, args)
      }
      return []
    },
    scanAreas: (_, _args, { req, perms }) => {
      if (perms?.scanAreas) {
        const scanAreas = config.getAreas(req, 'scanAreas')
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
        const scanAreas = config.getAreas(req, 'scanAreasMenu')
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
                  manual: !!config.getSafe('manualAreas.length'),
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
      const scanner = config.getSafe('scanner')

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
                  formatted: await geocoder(
                    webhook.nominatimUrl,
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
      const options = config.getSafe('api.searchable')
      return Object.keys(options).filter((k) => options[k] && perms[k])
    },
    spawnpoints: (_, args, { perms, Db }) => {
      if (perms?.spawnpoints) {
        return Db.query('Spawnpoint', 'getAll', perms, args)
      }
      return []
    },
    submissionCells: async (_, args, { req, perms, Db }) => {
      const { submissionZoom } = config.getMapConfig(req).general
      if (perms?.submissionCells && args.zoom >= submissionZoom - 1) {
        const [pokestops, gyms] = await Db.submissionCells(perms, args)
        return [
          {
            ...(args.zoom >= submissionZoom
              ? getPlacementCells(args, pokestops, gyms)
              : { pois: [], level17Cells: [] }),
            level14Cells: getTypeCells(args, pokestops, gyms),
          },
        ]
      }
      return [{ level17Cells: [], level14Cells: [], pois: [] }]
    },
    weather: (_, args, { perms, Db }) => {
      if (perms?.weather) {
        return Db.query('Weather', 'getAll', perms, args)
      }
      return []
    },
    webhook: async (_, { status, category }, { req, perms, Event }) => {
      if (perms?.webhooks && req.user?.selectedWebhook) {
        const result = await Event.webhookObj[req.user.selectedWebhook].api(
          PoracleAPI.getWebhookId(req.user),
          category,
          status,
        )
        if (category === 'pokemon') {
          result.pokemon = result.pokemon.map((x) => ({
            ...x,
            allForms: !x.form,
            pvpEntry: !!x.pvp_ranking_league,
            xs: x.max_weight !== 9000000,
            xl: x.min_weight !== 0,
          }))
        }
        if (category === 'invasion') {
          const { invasions } = Event.masterfile
          result.invasion = result.invasion.map((x) => ({
            ...x,
            real_grunt_id:
              +Object.keys(invasions).find(
                (key) =>
                  invasions[key]?.type?.toLowerCase() ===
                    x.grunt_type.toLowerCase() &&
                  invasions[key].gender === (x.gender || 1),
              ) || 0,
          }))
        }
        if (category === 'raid') {
          result.raid = result.raid.map((x) => ({
            ...x,
            allMoves: x.move === 9000,
          }))
        }

        return result
      }
      return {}
    },
    webhookAreas: async (_, __, { req, perms, Event }) => {
      if (perms.webhooks.includes(req.user?.selectedWebhook) && req.user?.id) {
        return Event.webhookObj[req.user.selectedWebhook].getUserAreas(
          PoracleAPI.getWebhookId(req.user),
        )
      }
      return []
    },
    webhookCategories: async (_, __, { req, perms, Event }) => {
      if (req.user?.id && perms.webhooks.includes(req.user?.selectedWebhook)) {
        const human = await Event.webhookObj[req.user?.selectedWebhook].api(
          PoracleAPI.getWebhookId(req.user),
          'oneHuman',
          'GET',
        )
        return Event.webhookObj[req.user?.selectedWebhook].getAllowedCategories(
          human.blocked_alerts,
        )
      }
      return []
    },
    webhookContext: async (_, __, { req, perms, Event }) => {
      if (
        req.user?.selectedWebhook &&
        perms?.webhooks.includes(req.user?.selectedWebhook)
      ) {
        return Event.webhookObj[req.user.selectedWebhook].getClientContext(
          req.user.strategy || req.user.webhookStrategy,
        )
      }
    },
    webhookGeojson: async (_, __, { perms, req, Event }) => {
      if (perms?.webhooks) {
        return Event.webhookObj[req.user.selectedWebhook].getClientGeojson(
          PoracleAPI.getWebhookId(req.user),
        )
      }
      return null
    },
    webhookUser: async (_, __, { req, perms }) => {
      if (req.user?.id && perms.webhooks) {
        const enabledHooks = config
          .getSafe('webhooks')
          .filter((hook) => hook.enabled)
          .map((x) => x.name)
        return {
          webhooks: (perms.webhooks || []).filter((x) =>
            enabledHooks.includes(x),
          ),
          selected: req.user?.selectedWebhook,
        }
      }
      return {}
    },
    scanner: (_, args, { req, perms }) => {
      const { category, method, data } = args
      if (category === 'getQueue') {
        return scannerApi(category, method, data, req?.user)
      }
      if (perms?.scanner?.includes(category)) {
        return scannerApi(category, method, data, req?.user)
      }
      return {}
    },
    validateUser: (_, __, { user, perms }) => ({
      loggedIn: !!user,
      admin: perms?.admin,
    }),
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
    webhook: async (_, args, { req, Event, perms }) => {
      if (
        req.user?.selectedWebhook &&
        perms?.webhooks?.includes(req.user?.selectedWebhook)
      ) {
        const { category, data, status } = args
        const result = await Event.webhookObj[req.user.selectedWebhook].api(
          PoracleAPI.getWebhookId(req.user),
          category,
          status,
          data,
        )
        return result
      }
      return {}
    },
    webhookChange: async (_, args, { req, Db, perms, Event }) => {
      if (req.user?.id && perms.webhooks.includes(args.webhook)) {
        const user = await Db.query(
          'User',
          'updateWebhook',
          req.user.id,
          args.webhook,
        )
        req.user.selectedWebhook = user.selectedWebhook
        req.session.save()
        return Event.webhookObj[user.selectedWebhook].api(
          PoracleAPI.getWebhookId(req.user),
          'oneHuman',
          'GET',
        )
      }
      return ''
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
    saveComponent: async (_, { code, component }, { perms, req }) => {
      if (perms.admin && code && component) {
        const configFolder = resolve(__dirname, '../configs')
        const ts = Math.floor(Date.now() / 1000)
        if (
          fs.existsSync(`${configFolder}/${component}/${req.headers.host}.json`)
        ) {
          fs.copyFileSync(
            `${configFolder}/${component}/${req.headers.host}.json`,
            `${configFolder}/${component}/${req.headers.host}_${ts}.json`,
          )
          fs.writeFileSync(
            `${configFolder}/${component}/${req.headers.host}.json`,
            code,
            'utf8',
          )
          return `Saved to ${configFolder}/${component}/${req.headers.host}.json`
        }
        if (fs.existsSync(`${configFolder}/${component}.json`)) {
          fs.copyFileSync(
            `${configFolder}/${component}.json`,
            `${configFolder}/${component}_${ts}.json`,
          )
        }
        fs.writeFileSync(`${configFolder}/${component}.json`, code, 'utf8')
        return `Saved to ${configFolder}/${component}.json`
      }
      return null
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
        const user = await Db.query('User', 'getOne', req.user.id)
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
    setGymBadge: async (_, args, { req, Db, perms }) => {
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
