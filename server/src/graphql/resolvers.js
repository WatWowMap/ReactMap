// @ts-check

const fs = require('fs')
const { resolve } = require('path')
const { GraphQLJSON } = require('graphql-type-json')
const { S2LatLng, S2RegionCoverer, S2LatLngRect } = require('nodes2ts')

const config = require('@rm/config')
const { log, TAGS } = require('@rm/logger')
const { missing, readAndParseJson } = require('@rm/locales')

const { buildDefaultFilters } = require('../filters/builder/base')
const { filterComponents } = require('../utils/filterComponents')
const { annotateTelegramBlocks } = require('../utils/getTelegramStrategy')
const { validateSelectedWebhook } = require('../utils/validateSelectedWebhook')
const { PoracleAPI } = require('../services/Poracle')
const { geocoder } = require('../services/geocoder')
const { scannerApi } = require('../services/scannerApi')
const { getPolyVector } = require('../utils/getPolyVector')
const { getPlacementCells } = require('../utils/getPlacementCells')
const { getTypeCells } = require('../utils/getTypeCells')
const { getValidCoords } = require('../utils/getValidCoords')
const {
  hasAnyPokestopPermission,
} = require('../utils/hasAnyPokestopPermission')
const personalShiny = require('../services/personalShiny')
const playerIdLookup = require('../services/playerIdLookup')
const { getPersonalShinyMax } = require('../utils/personalShinyLimits')

/** @type {import("@apollo/server").ApolloServerOptions<import("@rm/types").GqlContext>['resolvers']} */
const resolvers = {
  JSON: GraphQLJSON,
  Query: {
    available: (_, _args, { Event, Db, perms }) => {
      const supportsShinyStats = Array.isArray(Db.models?.Pokemon)
        ? Db.models.Pokemon.some(({ SubModel, ...ctx }) =>
            typeof SubModel.supportsShinyStats === 'function'
              ? SubModel.supportsShinyStats(ctx)
              : false,
          )
        : false

      const data = {
        questConditions: perms.quests ? Db.questConditions : {},
        masterfile: { ...Event.masterfile, invasions: Event.invasions },
        filters: buildDefaultFilters(perms),
        audio: {
          ...config.getSafe('audio'),
          styles: Event.uaudio,
        },
        icons: {
          ...config.getSafe('icons'),
          styles: Event.uicons,
        },
        supportsShinyStats,
      }
      return data
    },
    availablePokemon: (_, _args, { Event, perms }) =>
      perms?.pokemon ? Event.available.pokemon : [],
    availableGyms: (_, _args, { Event, perms }) =>
      Event.available.gyms.filter((x) => {
        if (x.startsWith('g') || x.startsWith('t')) {
          return perms?.gyms
        }
        if (
          x.startsWith('r') ||
          x.startsWith('e') ||
          Number.isInteger(Number(x.charAt(0)))
        ) {
          return perms?.raids
        }
        return false
      }),
    availableNests: (_, _args, { Event, perms }) =>
      perms?.nests ? Event.available.nests : [],
    availablePokestops: (_, _args, { Event, perms }) =>
      Event.available.pokestops.filter((x) => {
        if (x.startsWith('i') || x.startsWith('a')) {
          return perms?.invasions
        }
        if (
          x.startsWith('b') ||
          x.startsWith('f') ||
          x.startsWith('h') ||
          x.startsWith('y')
        ) {
          return perms?.eventStops
        }
        if (
          x.startsWith('q') ||
          x.startsWith('m') ||
          x.startsWith('x') ||
          x.startsWith('c') ||
          x.startsWith('d') ||
          x.startsWith('p') ||
          x.startsWith('u') ||
          Number.isInteger(Number(x.charAt(0)))
        ) {
          return perms?.quests
        }
        if (x.startsWith('l')) {
          return perms?.lures
        }
        return perms?.pokestops
      }),
    availableStations: (_, _args, { Event, perms }) =>
      perms?.dynamax ? Event.available.stations : [],
    availableTappables: (_, _args, { Event, perms }) =>
      perms?.tappables ? Event.available.tappables : [],
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
    // the user's players, read again while a friend code is being looked up
    personalShinyPlayers: async (_, __, { req, perms, Db, Event }) =>
      perms?.personalShiny && req.user?.id
        ? personalShiny.getPlayers(req.user, Db, Event)
        : null,
    settingsSync: async (_, { withData }, { req, perms, Db }) => {
      if (!perms?.backups || !req?.user?.id) return null
      return (
        (await Db.models.Backup.getSync(req.user.id, !!withData)) || { rev: 0 }
      )
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
    /** @param {unknown} _ @param {{ mode: 'scanNext' | 'scanZone', points: [number, number][] }} args */
    checkValidScan: (_, { mode, points }, { perms }) =>
      getValidCoords(mode, points, perms),
    /** @param {unknown} _ @param {{ component: 'loginPage' | 'donationPage' | 'messageOfTheDay' }} args */
    customComponent: (_, { component }, { perms, req, username }) => {
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
            const strategies = config.getSafe('authentication.strategies')
            const prepare = (blocks) =>
              annotateTelegramBlocks(
                filterComponents(blocks, !!username, perms.donor),
                strategies,
              )
            return {
              ...rest,
              footerButtons: prepare(footerButtons),
              components: prepare(components),
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
    fabButtons: async (_, _args, { perms, username, req, Db, Event }) => {
      const { donationPage, misc } = config.getMapConfig(req)

      const scanner = config.getSafe('scanner')

      // the webhook stored now: the session keeps the one from its login
      const stored = req.user?.id
        ? await Db.query('User', 'getOne', req.user.id)
        : null
      const previous = stored?.selectedWebhook || req.user?.selectedWebhook
      const selectedWebhook = await validateSelectedWebhook(
        req.user ? { ...req.user, selectedWebhook: previous } : req.user,
        Db,
        Event,
      )
      if (selectedWebhook) {
        req.user.selectedWebhook = selectedWebhook
        req.session.save()
        // the webhook was switched (access to the old one lost): the
        // personal shiny players follow, and are unlinked in the old one
        if (previous && previous !== selectedWebhook) {
          personalShiny
            .moveWebhook({ ...req.user, perms }, Db, Event, previous)
            .catch((e) =>
              log.warn(
                TAGS.webhooks,
                'personal shiny: moving players failed',
                e,
              ),
            )
        }
      }

      return {
        custom: misc.customFloatingIcons,
        donationButton:
          donationPage.showOnMap &&
          (perms.donor ? donationPage.showToDonors : true)
            ? donationPage.fabIcon
            : '',
        profileButton: !!(username && misc.enableFloatingProfileButton),
        scanZone:
          scanner.scanZone.enabled && perms.scanner.includes('scanZone'),
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
            webhook.geocoderProvider,
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
      if (perms?.gyms || perms?.raids) {
        return Db.getOne('Gym', args.id)
      }
      return {}
    },
    locales: async (_, { locale }) => {
      const missingLocales = await missing(`${locale}.json`)
      return locale
        ? {
            missing: Object.keys(missingLocales),
            human: await readAndParseJson(`${locale}.json`, true),
            ai: await readAndParseJson(`${locale}.json`, false),
          }
        : { missing: null, human: null, ai: null }
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
      if (perms?.nests) {
        return Db.getOne('Nest', args.id)
      }
      return {}
    },
    pokestops: (_, args, { perms, Db }) => {
      if (hasAnyPokestopPermission(perms)) {
        return Db.query('Pokestop', 'getAll', perms, args)
      }
      return []
    },
    pokestopsSingle: (_, args, { perms, Db }) => {
      if (hasAnyPokestopPermission(perms)) {
        return Db.getOne('Pokestop', args.id)
      }
      return {}
    },
    pokemon: async (_, rawArgs, { perms, Db, req, Event }) => {
      // also for users who lost the pokemon perm with it (a role ran out)
      if (!perms?.personalShiny) {
        personalShiny.unlinkWithoutPerm(req.user, Db, Event)
      }
      if (!perms?.pokemon) return []
      // the shiny IV range is an IV condition, which needs the iv permission
      let args = perms.iv
        ? rawArgs
        : {
            ...rawArgs,
            filters: Object.fromEntries(
              Object.entries(rawArgs.filters || {}).map(([key, filter]) => [
                key,
                filter && typeof filter === 'object' && filter.personal_shiny_iv
                  ? { ...filter, personal_shiny_iv: [0, 100] }
                  : filter,
              ]),
            ),
          }
      // the per-role limit is re-applied here so lowering it takes effect
      // without users having to re-save; paused players and friend codes
      // still being looked up count towards it
      const players = perms.personalShiny
        ? (await personalShiny.getPlayers(req.user, Db, Event))
            .slice(0, getPersonalShinyMax(perms))
            .filter((player) => player.id && !player.paused)
        : []
      // personal shinies off / include (all of them, besides the other
      // results, like the 0% / 100% quick selects) / only; only doesn't apply
      // to the legacy filter, which has no personal shiny conditions
      const shinyMode = perms.personalShiny
        ? args.filters.onlyPersonalShinyMode
        : 'off'
      const onlyPersonalShinyExclusive =
        shinyMode === 'only' && !args.filters.onlyLegacy
      args = {
        ...args,
        filters: {
          ...args.filters,
          onlyPersonalShinyExclusive,
        },
      }
      const getResults = () =>
        Db.query(
          'Pokemon',
          args.filters.onlyLegacy ? 'getLegacy' : 'getAll',
          perms,
          // a Golbat that rolls personal shinies marks the results itself
          { ...args, personalShinyPlayers: players },
        )
      if (!players.length) {
        // without active players, only personal shinies would leave the map
        // empty, so it is ignored until there are some again
        return onlyPersonalShinyExclusive
          ? Db.query('Pokemon', 'getAll', perms, {
              ...args,
              filters: { ...args.filters, onlyPersonalShinyExclusive: false },
              personalShinyPlayers: players,
            })
          : getResults()
      }
      const rates = await personalShiny.getRates(
        Db.models.Pokemon?.[0]?.SubModel?.getStatsKnex?.() ?? null,
      )
      // off: none are added (the results are still marked); include: every
      // shiny within the shiny IV ranges; only: those matching the filters
      const getShinies = () =>
        shinyMode === 'include' || shinyMode === 'only'
          ? Db.query(
              'Pokemon',
              'getPersonalShiny',
              perms,
              shinyMode === 'include'
                ? { ...args, personalShinyScan: true }
                : args,
              players,
              rates,
            )
          : []
      // the background quick select adds every Pokémon with a special
      // background for the user, like the 0% / 100% quick selects
      const getBackgrounds = () =>
        args.filters.onlyPersonalBackground && !args.filters.onlyLegacy
          ? Db.query(
              'Pokemon',
              'getPersonalShiny',
              perms,
              { ...args, personalBackgroundScan: true },
              players,
              rates,
            )
          : []
      // only personal shinies still marks backgrounds but adds none
      const [results, shinies, backgrounds] = await Promise.all([
        onlyPersonalShinyExclusive ? [] : getResults(),
        getShinies(),
        onlyPersonalShinyExclusive ? [] : getBackgrounds(),
      ])
      // what the scans found wins, it may come from Golbat's own rates
      /** @type {Map<string, Record<string, any>>} */
      const scanned = new Map()
      ;[...shinies, ...backgrounds].forEach((pkmn) => {
        const id = `${pkmn.id}`
        scanned.set(id, { ...scanned.get(id), ...pkmn })
      })
      /** @param {Record<string, any>} pkmn */
      const mark = (pkmn) => {
        const found = scanned.get(`${pkmn.id}`)
        const shiny = Array.isArray(pkmn.personal_shiny)
          ? pkmn.personal_shiny
          : found?.personal_shiny ||
            personalShiny.shinyFor(pkmn, players, rates)
        const background = Array.isArray(pkmn.personal_background)
          ? pkmn.personal_background
          : found?.personal_background ||
            personalShiny.backgroundFor(pkmn, players, rates)
        return {
          ...pkmn,
          personal_shiny: shiny,
          personal_background: background,
        }
      }
      const seen = new Set(results.map((pkmn) => `${pkmn.id}`))
      const all = [
        ...results.map(mark),
        ...[...scanned.values()]
          .filter((pkmn) => !seen.has(`${pkmn.id}`))
          .map(mark),
      ]
      // the rates only say that there is a background, not which: the one
      // Golbat sees most around here right now is the event's
      /** @type {Map<number, number>} */
      const seenBackgrounds = new Map()
      all.forEach(({ background }) => {
        if (background) {
          seenBackgrounds.set(
            background,
            (seenBackgrounds.get(background) || 0) + 1,
          )
        }
      })
      const eventBackground = [...seenBackgrounds].sort(
        (a, b) => b[1] - a[1],
      )[0]?.[0]
      return all.map((pkmn) =>
        pkmn.personal_background.length && !pkmn.background && eventBackground
          ? { ...pkmn, personal_background_id: eventBackground }
          : pkmn,
      )
    },
    pokemonSingle: (_, args, { perms, Db }) => {
      if (perms?.pokemon) {
        return Db.getOne('Pokemon', args.id)
      }
      return {}
    },
    pokemonShinyStats: async (_, args, { perms, Db }) => {
      if (!perms?.pokemon) {
        return null
      }
      const sources = Db.models?.Pokemon
      if (!Array.isArray(sources)) {
        return null
      }
      const results = await Promise.all(
        sources.map(({ SubModel, ...ctx }) =>
          typeof SubModel.getShinyStats === 'function'
            ? SubModel.getShinyStats(perms, args, ctx)
            : Promise.resolve(null),
        ),
      )
      return results.find(Boolean) || null
    },
    portals: (_, args, { perms, Db }) => {
      if (perms?.portals) {
        return Db.query('Portal', 'getAll', perms, args)
      }
      return []
    },
    portalsSingle: (_, args, { perms, Db }) => {
      if (perms?.portals) {
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

          // // Adds new blanks to account for area restrictions trimming some
          // filtered.forEach(({ children }) => {
          //   if (children.length % 2 === 1) {
          //     children.push({
          //       type: 'Feature',
          //       properties: {
          //         name: '',
          //         manual: !!config.getSafe('manualAreas.length'),
          //       },
          //     })
          //   }
          // })
          return filtered
        }
        return scanAreas.filter((parent) => parent.children.length)
      }
      return []
    },
    scannerConfig: (_, { mode }, { perms }) => {
      const scanner = config.getSafe('scanner')
      const modeConfig = scanner[mode]

      if (perms.scanner?.includes(mode) && modeConfig?.enabled) {
        const bypassCooldown = perms.scannerCooldownBypass?.includes(mode)
        const cooldownSeconds = bypassCooldown
          ? 0
          : modeConfig.userCooldownSeconds

        if (mode === 'scanZone') {
          return {
            scannerType: scanner.backendConfig.platform,
            showScanCount: scanner.scanZone.showScanCount,
            showScanQueue: scanner.scanZone.showScanQueue,
            advancedOptions: scanner.scanZone.advancedScanZoneOptions,
            pokemonRadius: scanner.scanZone.scanZoneRadius.pokemon,
            gymRadius: scanner.scanZone.scanZoneRadius.gym,
            spacing: scanner.scanZone.scanZoneSpacing,
            maxSize: scanner.scanZone.scanZoneMaxSize,
            cooldown: cooldownSeconds,
            refreshQueue: scanner.backendConfig.queueRefreshInterval,
            enabled: modeConfig.enabled,
          }
        }

        return {
          scannerType: scanner.backendConfig.platform,
          showScanCount: scanner.scanNext.showScanCount,
          showScanQueue: scanner.scanNext.showScanQueue,
          cooldown: cooldownSeconds,
          refreshQueue: scanner.backendConfig.queueRefreshInterval,
          enabled: modeConfig.enabled,
        }
      }
      return null
    },
    search: async (_, args, { Event, perms, Db, req }) => {
      const { category, search } = args
      // the user's own shinies / backgrounds are listed without a name too
      if (
        (!search || !search.trim()) &&
        category !== 'personalShiny' &&
        category !== 'personalBackground'
      ) {
        return []
      }
      switch (category) {
        case 'pokemon':
          return perms.pokemon ? Db.search('Pokemon', perms, args) : []
        case 'pokestops':
          return perms.pokestops ? Db.search('Pokestop', perms, args) : []
        case 'raids':
          return perms.raids ? Db.search('Gym', perms, args, 'searchRaids') : []
        case 'gyms': {
          if (!perms.gyms) return []
          const results = await Db.search('Gym', perms, args)
          if (req.user?.selectedWebhook) {
            const webhook = Event.webhookObj[req.user.selectedWebhook]
            if (webhook?.nominatimUrl && results.length) {
              const withFormatted = await Promise.all(
                results.map(async (result) => ({
                  ...result,
                  formatted: await geocoder(
                    webhook.nominatimUrl,
                    { lat: result.lat, lon: result.lon },
                    true,
                    webhook.addressFormat,
                    webhook.geocoderProvider,
                  ),
                })),
              )
              return withFormatted
            }
          }
          return results
        }
        case 'portals':
          return perms.portals ? Db.search('Portal', perms, args) : []
        case 'nests':
          return perms.nests ? Db.search('Nest', perms, args) : []
        case 'stations':
          return perms.stations ? Db.search('Station', perms, args) : []
        case 'personalShiny':
        case 'personalBackground': {
          // like the tabs, only when the admin has the search turned on
          if (!config.getSafe('api.searchable')?.[category]) return []
          // the user's own shinies / backgrounds near the map's centre; they
          // are Pokémon positions, so the pokemon perm is needed as well
          if (!perms.personalShiny || !perms.pokemon) return []
          const players = (await personalShiny.getPlayers(req.user, Db, Event))
            .slice(0, getPersonalShinyMax(perms))
            .filter((player) => player.id && !player.paused)
          if (!players.length) return []
          const rates = await personalShiny.getRates(
            Db.models.Pokemon?.[0]?.SubModel?.getStatsKnex?.() ?? null,
          )
          const found = await Db.query('Pokemon', 'searchPersonal', perms, {
            ...args,
            kind: category === 'personalShiny' ? 'shiny' : 'background',
            players,
            rates,
          })
          // each scanner source sorts and limits its own results
          return (Array.isArray(found) ? found : [])
            .sort((a, b) => a.distance - b.distance)
            .slice(0, config.getSafe('api.searchResultsLimit'))
        }
        default:
          return []
      }
    },
    searchInvasion: (_, args, { perms, Db }) => {
      const { search } = args
      if (perms?.invasions) {
        if (!search || !search.trim()) {
          return []
        }
        return Db.search('Pokestop', perms, args, 'searchInvasions')
      }
      return []
    },
    searchLure: (_, args, { perms, Db }) => {
      const { search } = args
      if (perms.lures) {
        if (!search || !search.trim()) {
          return []
        }
        return Db.search('Pokestop', perms, args, 'searchLures')
      }
      return []
    },
    searchQuest: (_, args, { perms, Db }) => {
      const { search } = args
      if (perms.quests) {
        if (!search || !search.trim()) {
          return []
        }
        return Db.search('Pokestop', perms, args, 'searchQuests')
      }
      return []
    },
    searchable: (_, __, { perms }) => {
      const options = config.getSafe('api.searchable')
      // the personal shiny and background searches need personal shiny, and
      // pokemon as they list Pokémon
      return Object.keys(options).filter(
        (k) =>
          options[k] &&
          (k === 'personalShiny' || k === 'personalBackground'
            ? !!perms.personalShiny && !!perms.pokemon
            : !!perms[k]),
      )
    },
    spawnpoints: (_, args, { perms, Db }) => {
      if (perms?.spawnpoints) {
        return Db.query('Spawnpoint', 'getAll', perms, args)
      }
      return []
    },
    stations: (_, args, { perms, Db }) => {
      if (perms?.stations || perms?.dynamax) {
        return Db.query('Station', 'getAll', perms, args)
      }
      return []
    },
    stationPokemon: (_, { id }, { perms, Db }) => {
      if (perms?.stations) {
        return Db.query('Station', 'getDynamaxMons', id)
      }
      return []
    },
    tappables: (_, args, { perms, Db }) => {
      if (perms?.tappables) {
        return Db.query('Tappable', 'getAll', perms, args)
      }
      return []
    },
    tappableById: async (_, { id }, { perms, Db }) => {
      if (perms?.tappables) {
        const results = await Db.query('Tappable', 'getById', perms, id)
        return Array.isArray(results) ? results[0] || null : results
      }
      return null
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
        if (category === 'pokemon' && result.pokemon) {
          result.pokemon = result.pokemon.map((x) => ({
            ...x,
            allForms: !x.form,
            pvpEntry: !!x.pvp_ranking_league,
            xs: x.max_weight !== 9000000,
            xl: x.min_weight !== 0,
          }))
        }
        if (category === 'invasion' && result.invasion) {
          result.invasion = result.invasion.map((x) => ({
            ...x,
            real_grunt_id: PoracleAPI.getRealGruntId(x, Event.invasions),
          }))
        }
        if (category === 'raid' && result.raid) {
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
    /** @param {unknown} _ @param {import('@rm/types').ScanOnDemandReq} args */
    scanner: (_, args, { req, perms }) => {
      const { category, method, data } = args
      if (category === 'getQueue') {
        return scannerApi(category, method, data, req?.user)
      }
      const bypassCooldown = perms?.scannerCooldownBypass?.includes(category)
      const cooldownExpired =
        !req.session.cooldown || req.session.cooldown < Date.now()

      if (
        perms?.scanner?.includes(category) &&
        (bypassCooldown || cooldownExpired)
      ) {
        const validCoords = getValidCoords(category, data?.scanCoords, perms)

        if (!bypassCooldown) {
          const cooldown =
            config.getSafe(`scanner.${category}.userCooldownSeconds`) *
              validCoords.filter(Boolean).length *
              1000 +
            Date.now()
          req.session.cooldown = cooldown
        }
        return scannerApi(
          category,
          method,
          {
            ...data,
            scanCoords: data.scanCoords?.filter((__, i) => validCoords[i]),
          },
          req?.user,
        )
      }
      return {}
    },
    validateUser: (_, __, { username, perms }) => ({
      loggedIn: !!username,
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
    setSettingsSync: async (_, { data, baseRev }, { req, perms, Db }) => {
      if (
        !perms?.backups ||
        !req?.user?.id ||
        !data ||
        typeof data !== 'object'
      )
        return null
      return Db.models.Backup.setSync(data, Number(baseRev) || 0, req.user.id)
    },
    updateBackup: async (_, args, { req, perms, Db }) => {
      if (perms?.backups && req.user?.id) {
        await Db.models.Backup.update(args.backup, req.user.id)
      }
    },
    nestSubmission: async (_, args, { req, perms, Db, username }) => {
      if (perms?.nestSubmissions && req.user?.id) {
        return Db.query(
          'NestSubmission',
          'create',
          {
            name: args.name,
            nest_id: args.id,
          },
          {
            submitted_by: username,
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
        if (category === 'pokemon' && result.pokemon) {
          result.pokemon = result.pokemon.map((x) => ({
            ...x,
            allForms: !x.form,
            pvpEntry: !!x.pvp_ranking_league,
            xs: x.max_weight !== 9000000,
            xl: x.min_weight !== 0,
          }))
        }
        if (category === 'invasion' && result.invasion) {
          result.invasion = result.invasion.map((x) => ({
            ...x,
            real_grunt_id: PoracleAPI.getRealGruntId(x, Event.invasions),
          }))
        }
        if (category === 'raid' && result.raid) {
          result.raid = result.raid.map((x) => ({
            ...x,
            allMoves: x.move === 9000,
          }))
        }
        return result
      }
      return {}
    },
    webhookChange: async (_, args, { req, Db, perms, Event }) => {
      if (req.user?.id && perms.webhooks.includes(args.webhook)) {
        // the webhook selected now: another device may have changed it since
        // this session started
        const stored = await Db.query('User', 'getOne', req.user.id)
        const previous = stored?.selectedWebhook || req.user.selectedWebhook
        const user = await Db.query(
          'User',
          'updateWebhook',
          req.user.id,
          args.webhook,
        )
        req.user.selectedWebhook = user.selectedWebhook
        req.session.save()
        // the personal shiny players follow the user to the other Poracle
        personalShiny
          .moveWebhook({ ...req.user, perms }, Db, Event, previous)
          .catch((e) =>
            log.warn(TAGS.webhooks, 'personal shiny: moving players failed', e),
          )
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
      // only the fields the profile offers: the rest of the user's data
      // (personal shiny players, status, ...) is not for the user to write
      const editable = config
        .getSafe('database.settings.extraUserFields')
        .filter((field) => typeof field === 'string' || !field?.disabled)
        .map((field) => (typeof field === 'string' ? field : field?.database))
      if (!editable.includes(key)) return false
      if (req.user?.id) {
        // queued with the user's other saves of the same data
        await personalShiny.queueSave(req.user.id, async () => {
          const user = await Db.query('User', 'getOne', req.user.id)
          if (user) {
            const data =
              typeof user.data === 'string'
                ? JSON.parse(user.data)
                : user.data || {}
            data[key] = value
            await user.$query().update({ data: JSON.stringify(data) })
          }
        })
        return true
      }
      return false
    },
    setPersonalShiny: async (_, { players }, { req, Db, perms, Event }) => {
      if (!perms?.personalShiny || !req.user?.id) return null
      const lookup = playerIdLookup.enabled()
      // the whole save runs in the user's save queue, so saves (and the
      // background lookups) can't overwrite each other or Poracle's links
      return personalShiny.queueSave(req.user.id, async () => {
        const user = await Db.query('User', 'getOne', req.user.id)
        if (!user) return null
        const data =
          typeof user.data === 'string'
            ? JSON.parse(user.data)
            : user.data || {}
        const before = personalShiny.cleanPlayers(data.personalShiny)
        const max = getPersonalShinyMax(perms)
        const saved = new Map(
          before.filter((p) => p.fc).map((player) => [player.fc, player]),
        )
        const cleaned = personalShiny
          .cleanPlayers(players)
          .slice(0, max)
          .map((player) => {
            if (!player.fc) return player
            const base = {
              name: player.name,
              ...(player.paused ? { paused: true } : {}),
            }
            // without lookups there are only player ids
            if (!lookup) return { ...base, id: player.id }
            // the id and trainer behind a friend code only ever come from the
            // lookup, never from the client
            const known = saved.get(player.fc)
            return {
              ...base,
              id: known?.id || '',
              fc: player.fc,
              ...(known?.trainer ? { trainer: known.trainer } : {}),
              ...(known?.lookup ? { lookup: known.lookup } : {}),
            }
          })
          // nothing would ever look a friend code up, also not one typed as id
          .filter(
            (player) =>
              player.fc ||
              (player.id && !playerIdLookup.normalizeFriendCode(player.id)),
          )
        // the limit is checked before anything is looked up, so a refused
        // save costs no lookups
        const { log: changes, retryAt } = personalShiny.checkChanges(
          data.personalShinyChanges,
          before,
          cleaned,
          max,
          config.getSafe('authentication.perms.personalShiny.changeLimit'),
        )
        if (retryAt) return { error: 'change_limit', retryAt }
        // a new code, or one whose lookup ended without an id, is asked for
        // again
        const forceCodes = new Set(
          cleaned
            .map((player) => player.fc)
            .filter(
              (fc) =>
                fc && (!saved.has(fc) || saved.get(fc)?.lookup === 'failed'),
            ),
        )
        const result = lookup
          ? (await playerIdLookup.resolvePlayers(cleaned, { forceCodes }))
              .players
          : cleaned
        // the lookup can take a while: the rest of the user's data is read
        // again, so only the personal shiny fields are written
        const fresh = (await Db.query('User', 'getOne', req.user.id)) || user
        const freshData =
          typeof fresh.data === 'string'
            ? JSON.parse(fresh.data)
            : fresh.data || {}
        freshData.personalShiny = result
        freshData.personalShinyChanges = changes
        await fresh.$query().update({ data: JSON.stringify(freshData) })
        personalShiny.setCachedPlayers(req.user.id, result)
        // with the webhook the user has selected now, which another device
        // may have changed since this session started
        await personalShiny.syncPoracle(
          {
            ...req.user,
            selectedWebhook: fresh.selectedWebhook || req.user.selectedWebhook,
          },
          Event,
          before,
          result,
        )
        return result
      })
    },
    setGymBadge: async (_, args, { req, Db, perms }) => {
      if (perms?.gymBadges && req?.user?.id) {
        await Db.models.Badge.insert(args.badge, args.gymId, req.user.id)
        return true
      }
      return false
    },
  },
}

module.exports = { resolvers }
