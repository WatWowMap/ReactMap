// @ts-check
/* global BigInt */
// java.util.Random is reproduced bit for bit, so bitwise operators are required
/* eslint-disable no-bitwise */
const crypto = require('crypto')
const { default: fetch } = require('node-fetch')

const config = require('@rm/config')
const { log, TAGS } = require('@rm/logger')

const playerIdLookup = require('./playerIdLookup')
const { getPersonalShinyMax } = require('../utils/personalShinyLimits')
const { PoracleAPI } = require('./Poracle')

/** @param {import('@rm/types').ExpressUser} user its id in Poracle */
const webhookId = (user) => PoracleAPI.getWebhookId(user)

/**
 * Personal shiny prediction.
 *
 * The game decides whether a wild encounter is shiny for a player with a
 * java.util.Random seeded from sha1(encounterId as uint64 LE + playerId). The
 * first nextFloat() is compared against the shiny rate of that species/form.
 * The rate is estimated from Golbat's `pokemon_shiny_stats` and snapped to the
 * known in-game rates. When `api.shinyRates.url` points to a rates service
 * (`{ rates: [{ pokemon, form, costume, prediction }], unsupportedPokemon }`),
 * its measured rates are used first and the own estimates fill the gaps, or
 * stand in alone while the service can't be reached.
 *
 * All prediction lives in this module so it can later be swapped for Golbat's
 * own `annotate_for` support without touching the rest of ReactMap.
 */

const MULTIPLIER = 0x5deece66dn
const MASK = (1n << 48n) - 1n
const DEFAULT_RATE = 1 / 512
/** Known "1 in N" rates the measurements are snapped to */
const BUCKETS = [512, 256, 128, 64, 25, 20, 10]
const TOLERANCE = Math.log(1.3)
const MIN_SHINIES = 20
const WINDOWS = [1, 2, 14]
const NEVER_SHINY_CHECKS = 5000
const RATES_TTL = 60 * 60 * 1000
const RATES_RETRY_MS = 5 * 60 * 1000
/** How long the last rates of a rates service that can't be reached are used */
const REMOTE_REUSE_MS = 3 * 60 * 60 * 1000
/** Draws kept per encounter and player, so they aren't hashed on every request */
const MAX_CACHED_DRAWS = 150_000
const REMOTE_TIMEOUT_MS = 10_000
const PLAYERS_TTL = 60 * 1000
// how often the players are linked in Poracle again while the map is used,
// for users that were not registered there yet when they saved
const RESYNC_MS = 60 * 60 * 1000
// absolute cap; the per-role limit is applied by utils/personalShinyLimits
const MAX_PLAYERS = 50
// the Pokémon Golbat #423 rolls: tappable encounters (lured or not) take the
// same per-player draws as wild spawns, nearby and lure sightings don't
const ELIGIBLE_SEEN_TYPES = new Set([
  'wild',
  'encounter',
  'tappable_encounter',
  'tappable_lure_encounter',
])
const DITTO_ID = 132
/** A known Ditto is shiny on the third draw at its own rate */
const DITTO_RATE = 1 / 64

/**
 * Shiny rates by `pokemonId-form` (or `pokemonId` for a whole species, 0 =
 * never shiny). A rates service adds its fallback for unlisted variants,
 * per-timezone overrides (local events such as Community Day) and the rates
 * of special backgrounds. Without a rates service, only variants seen shiny
 * here (`seenShiny`) can be shiny: an unreleased shiny would otherwise be
 * predicted at the default rate until enough checks rule it out.
 * @typedef {Map<string, number> & {
 *  fallback?: number,
 *  remote?: boolean,
 *  seenShiny?: Set<string>,
 *  overrides?: Map<string, Record<string, number>>,
 *  backgrounds?: Map<string, number>,
 *  backgroundOverrides?: Map<string, Record<string, number>>,
 * }} Rates
 */

/**
 * The account behind a friend code, as the lookup saw it
 * @typedef {{ name?: string, level?: number, team?: string }} Trainer
 */

/**
 * `id` is empty while the player id behind `fc` (a friend code) is looked up;
 * `lookup` says why a lookup did not get one yet
 * @typedef {{
 *  name: string,
 *  id: string,
 *  fc?: string,
 *  trainer?: Trainer,
 *  paused?: boolean,
 *  lookup?: 'failed' | 'limited',
 * }} ShinyPlayer
 */

const TEAMS = new Set(['mystic', 'valor', 'instinct'])

/**
 * @param {any} trainer
 * @returns {Trainer | null}
 */
function cleanTrainer(trainer) {
  if (!trainer || typeof trainer !== 'object') return null
  const clean = {
    ...(trainer.name ? { name: `${trainer.name}`.slice(0, 32) } : {}),
    ...(Number.isInteger(trainer.level) && trainer.level > 0
      ? { level: trainer.level }
      : {}),
    ...(TEAMS.has(trainer.team) ? { team: trainer.team } : {}),
  }
  return Object.keys(clean).length ? clean : null
}

/** @type {{ loaded: number, rates: Map<string, number>, own?: (Map<string, number> & { seenShiny: Set<string> }) | null, remote?: Rates | null, remoteAt?: number } | null} */
let rateCache = null
/** @type {Promise<Map<string, number>> | null} */
let rateLoading = null
/** Golbat has no shiny stats table, so there are no own estimates */
let ownStatsMissing = false
/** @type {Map<number | string, { loaded: number, players: ShinyPlayer[] }>} */
const playerCache = new Map()
/** @type {Set<number | string>} users whose friend codes are being looked up */
const resolving = new Set()
/** @type {Map<string, number>} user + webhook -> last Poracle sync */
const lastSynced = new Map()
/** When the players of a user without the permission were last unlinked */
const lastUnlinked = new Map()
/**
 * Player ids whose unlinking failed (Poracle away), per user and webhook;
 * they are unlinked at the next sync
 * @type {Map<string, Set<string>>}
 */
const pendingUnlinks = new Map()

/** @param {{ id?: number | string, selectedWebhook?: string }} user */
const syncKey = (user) => `${user?.id}|${user?.selectedWebhook || ''}`

/**
 * The first java.util.Random#nextFloat() for this encounter and player.
 * @param {string | number | bigint} encounterId
 * @param {string} playerId
 * @returns {number}
 */
function shinyRoll(encounterId, playerId) {
  return draws(encounterId, playerId, 1)[0]
}

/**
 * The first `count` java.util.Random#nextFloat() for this encounter and
 * player: the game takes the shiny draw (if the variant can be shiny), then
 * the background draw (if one is on offer); a Ditto takes three.
 * @param {string | number | bigint} encounterId
 * @param {string} playerId
 * @param {number} count
 * @returns {number[]}
 */
function draws(encounterId, playerId, count) {
  const key = `${encounterId}|${playerId}`
  const cached = drawCache.get(key) || oldDraws.get(key)
  if (cached && cached.length >= count) return cached.slice(0, count)
  const result = computeDraws(encounterId, playerId, Math.max(count, 3))
  // two generations: a full cache becomes the old one instead of being
  // emptied, so what the last requests used is still there
  if (drawCache.size >= MAX_CACHED_DRAWS) {
    oldDraws = drawCache
    drawCache = new Map()
  }
  drawCache.set(key, result)
  return result.slice(0, count)
}

/** @type {Map<string, number[]>} */
let drawCache = new Map()
/** @type {Map<string, number[]>} */
let oldDraws = new Map()

/**
 * @param {string | number | bigint} encounterId
 * @param {string} playerId
 * @param {number} count
 * @returns {number[]}
 */
function computeDraws(encounterId, playerId, count) {
  const id = Buffer.alloc(8)
  id.writeBigUInt64LE(BigInt.asUintN(64, BigInt(encounterId)))
  const hash = crypto
    .createHash('sha1')
    .update(id)
    .update(playerId, 'utf8')
    .digest()
  let seed = (hash.readBigUInt64LE(0) ^ MULTIPLIER) & MASK
  const result = []
  for (let i = 0; i < count; i += 1) {
    seed = (seed * MULTIPLIER + 11n) & MASK
    result.push(Number(seed >> 24n) / 2 ** 24)
  }
  return result
}

/**
 * @param {number} ratio checks per shiny
 * @returns {number | null}
 */
function snap(ratio) {
  let best = BUCKETS[0]
  BUCKETS.forEach((bucket) => {
    if (
      Math.abs(Math.log(ratio) - Math.log(bucket)) <
      Math.abs(Math.log(ratio) - Math.log(best))
    ) {
      best = bucket
    }
  })
  return Math.abs(Math.log(ratio) - Math.log(best)) <= TOLERANCE ? best : null
}

/**
 * Builds `pokemonId-form` -> shiny rate (0 = never shiny) from daily rows.
 * Missing keys mean "unknown"; `seenShiny` lists the variants seen shiny.
 * @param {{ pokemon_id: number, form: number, days_ago: number, shiny: number, checks: number }[]} rows
 * @returns {Map<string, number> & { seenShiny: Set<string> }}
 */
function buildRates(rows) {
  /** @type {Map<string, { days_ago: number, shiny: number, checks: number }[]>} */
  const byKey = new Map()
  rows.forEach((row) => {
    const key = `${row.pokemon_id}-${row.form}`
    if (!byKey.has(key)) byKey.set(key, [])
    byKey.get(key).push({
      days_ago: Number(row.days_ago),
      shiny: Number(row.shiny) || 0,
      checks: Number(row.checks) || 0,
    })
  })
  const rates =
    /** @type {Map<string, number> & { seenShiny: Set<string> }} */ (new Map())
  rates.seenShiny = new Set()
  byKey.forEach((days, key) => {
    const sum = (window) =>
      days
        .filter((day) => day.days_ago < window)
        .reduce(
          (acc, day) => ({
            shiny: acc.shiny + day.shiny,
            checks: acc.checks + day.checks,
          }),
          { shiny: 0, checks: 0 },
        )
    const total = sum(WINDOWS[WINDOWS.length - 1])
    if (!total.shiny) {
      if (total.checks >= NEVER_SHINY_CHECKS) rates.set(key, 0)
      return
    }
    rates.seenShiny.add(key)
    for (let i = 0; i < WINDOWS.length; i += 1) {
      const { shiny, checks } = sum(WINDOWS[i])
      const bucket =
        shiny >= MIN_SHINIES && checks ? snap(checks / shiny) : null
      if (bucket) {
        rates.set(key, 1 / bucket)
        return
      }
    }
  })
  return rates
}

/**
 * Reads the rates of a rates service. Rates the service only assumes are left
 * out, so the own estimates are used for them; a species it doesn't support
 * is never shiny (`pokemonId` key).
 * @param {any} json
 * @returns {Map<string, number>}
 */
function parseRemoteRates(json) {
  /** @param {any} prediction @returns {number | null} */
  const probability = (prediction) => {
    if (!prediction || prediction.assumed) return null
    const value =
      prediction.supported === false ? 0 : Number(prediction.probability)
    return Number.isFinite(value) && value >= 0 && value < 1 ? value : null
  }
  /** @param {any} zones @returns {Record<string, number> | null} */
  const byZone = (zones) => {
    if (!zones || typeof zones !== 'object') return null
    const entries = Object.entries(zones)
      .map(([zone, prediction]) => [zone, probability(prediction)])
      .filter(([, value]) => value !== null)
    return entries.length ? Object.fromEntries(entries) : null
  }
  /** @type {Rates} */
  const rates = new Map()
  rates.overrides = new Map()
  rates.backgrounds = new Map()
  rates.backgroundOverrides = new Map()
  // the feed's own rate for the variants it doesn't list (assumed by nature)
  const fallback = Number(json?.fallback?.probability)
  if (
    json?.fallback?.supported !== false &&
    Number.isFinite(fallback) &&
    fallback > 0 &&
    fallback < 1
  ) {
    rates.fallback = fallback
  }
  ;(Array.isArray(json?.unsupportedPokemon)
    ? json.unsupportedPokemon
    : []
  ).forEach((pokemon) => {
    if (Number.isInteger(pokemon)) rates.set(`${pokemon}`, 0)
  })
  ;(Array.isArray(json?.rates) ? json.rates : []).forEach((rate) => {
    // costumes share the rate of their form here
    if (!Number.isInteger(rate?.pokemon) || rate.costume) return
    const key = `${rate.pokemon}-${rate.form || 0}`
    const base = probability(rate.prediction)
    if (base !== null) rates.set(key, base)
    const overrides = byZone(rate.overrides)
    if (overrides) rates.overrides.set(key, overrides)
    const background = probability(rate.background)
    if (background) rates.backgrounds.set(key, background)
    const backgroundOverrides = byZone(rate.background_overrides)
    if (backgroundOverrides) {
      rates.backgroundOverrides.set(key, backgroundOverrides)
    }
  })
  return rates
}

/** @returns {Promise<Map<string, number> | null>} null when not set or failed */
async function loadRemoteRates() {
  const url = config.getSafe('api.shinyRates.url')
  if (!url) return null
  try {
    const res = await fetch(url, { timeout: REMOTE_TIMEOUT_MS })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const rates = parseRemoteRates(await res.json())
    if (!rates.size) throw new Error('no rates')
    return rates
  } catch (e) {
    log.warn(
      TAGS.pokemon,
      `personal shiny: rates from ${url} not available, using own (${e.message})`,
    )
    return null
  }
}

/**
 * @param {import('knex').Knex | null} knex
 * @returns {Promise<Map<string, number> | null>} null when failed
 */
async function loadOwnRates(knex) {
  if (!knex) return null
  try {
    const [rows] = await knex.raw(
      `SELECT pokemon_id, form_id AS form,
        DATEDIFF(CURRENT_DATE, date) AS days_ago,
        SUM(count) AS shiny, SUM(total) AS checks
      FROM pokemon_shiny_stats
      WHERE area = 'world' AND fence = 'world'
        AND date >= CURRENT_DATE - INTERVAL ? DAY
      GROUP BY pokemon_id, form_id, date`,
      [WINDOWS[WINDOWS.length - 1]],
    )
    return buildRates(rows)
  } catch (e) {
    // no shiny stats at all (turned off in Golbat): own estimates are off,
    // not failing, so they aren't tried again every few minutes
    if (e?.code === 'ER_NO_SUCH_TABLE') {
      if (!ownStatsMissing) {
        log.warn(
          TAGS.pokemon,
          'personal shiny: no pokemon_shiny_stats table, own rates are off',
        )
      }
      ownStatsMissing = true
      return null
    }
    log.error(TAGS.pokemon, 'personal shiny: failed to load rates', e)
    return null
  }
}

/**
 * Shiny rates per species/form (`pokemonId-form`, or `pokemonId` for a whole
 * species), cached for an hour.
 * @param {import('knex').Knex | null} knex
 * @returns {Promise<Map<string, number>>}
 */
async function getRates(knex) {
  if (rateCache && Date.now() - rateCache.loaded < RATES_TTL) {
    return rateCache.rates
  }
  if (!rateLoading) {
    rateLoading = Promise.all([loadOwnRates(knex), loadRemoteRates()])
      .then(([ownLoaded, fetched]) => {
        const now = Date.now()
        // own estimates change slowly: the last ones that loaded are kept
        const own = ownLoaded || rateCache?.own || null
        // a rates service that is briefly away: its last rates are used for a
        // while, but not its local event overrides, which may have ended
        const stale =
          !fetched &&
          rateCache?.remote &&
          now - (rateCache.remoteAt || 0) < REMOTE_REUSE_MS
            ? withoutOverrides(rateCache.remote)
            : null
        const remote = fetched || stale
        /** @type {Rates} */
        const rates = new Map(
          [...(own || [])].filter(([key]) => !remote?.has(key.split('-')[0])),
        )
        remote?.forEach((rate, key) => rates.set(key, rate))
        rates.fallback = remote?.fallback
        rates.remote = !!remote
        rates.seenShiny = own?.seenShiny
        rates.overrides = remote?.overrides
        rates.backgrounds = remote?.backgrounds
        rates.backgroundOverrides = remote?.backgroundOverrides
        // a source that is set up but failed is tried again a little later
        const failed =
          (!!config.getSafe('api.shinyRates.url') && !fetched) ||
          (!!knex && !ownLoaded && !ownStatsMissing)
        rateCache = {
          loaded: failed ? now - RATES_TTL + RATES_RETRY_MS : now,
          rates,
          own,
          remote: fetched || rateCache?.remote || null,
          remoteAt: fetched ? now : rateCache?.remoteAt,
        }
        if (ownLoaded || fetched) {
          log.info(
            TAGS.pokemon,
            `personal shiny: loaded ${rates.size} rates (own ${own?.size ?? 0}, remote ${remote?.size ?? 0})`,
          )
        }
        return rates
      })
      .finally(() => {
        rateLoading = null
      })
  }
  // outdated rates keep serving while the new ones load
  return rateCache ? rateCache.rates : rateLoading
}

/**
 * A copy of a rates service's rates without its per-timezone overrides
 * @param {Rates} remote
 * @returns {Rates}
 */
function withoutOverrides(remote) {
  /** @type {Rates} */
  const copy = new Map(remote)
  copy.fallback = remote.fallback
  copy.backgrounds = remote.backgrounds
  copy.overrides = new Map()
  copy.backgroundOverrides = new Map()
  return copy
}

/**
 * Validates and normalises the players a user saved.
 * @param {unknown} input
 * @returns {ShinyPlayer[]}
 */
function cleanPlayers(input) {
  let list = input
  if (typeof list === 'string') {
    try {
      list = JSON.parse(list)
    } catch (e) {
      return []
    }
  }
  if (!Array.isArray(list)) return []
  return list
    .filter(Boolean)
    .map((player) => ({
      player,
      id:
        typeof player.id === 'string' && player.id.trim().length <= 64
          ? player.id.trim()
          : '',
      fc: playerIdLookup.normalizeFriendCode(player.fc),
    }))
    .filter(({ id, fc }) => id || fc)
    .slice(0, MAX_PLAYERS)
    .map(({ player, id, fc }, i) => ({
      name: `${player.name || ''}`.trim().slice(0, 24) || `Player ${i + 1}`,
      id,
      ...(fc ? { fc } : {}),
      ...(fc && id && cleanTrainer(player.trainer)
        ? { trainer: cleanTrainer(player.trainer) }
        : {}),
      ...(player.paused === true ? { paused: true } : {}),
      ...(!id &&
      fc &&
      (player.lookup === 'failed' || player.lookup === 'limited')
        ? { lookup: player.lookup }
        : {}),
    }))
}

/**
 * Limits how often a user swaps players: up to their maximum, players are
 * added freely; after that each new player is a change, at most `changes`
 * per slot (player the user may have) per `hours`. A player counts as new
 * when neither its player id nor its friend code was saved before; renaming,
 * pausing and removing are free. The returned `log` is kept in the user's
 * data between saves.
 * @param {{ free?: number, changes?: number[] } | undefined} saved
 * @param {ShinyPlayer[]} before
 * @param {ShinyPlayer[]} after
 * @param {number} max the user's player limit
 * @param {{ changes?: number, hours?: number }} [limit] 0 changes: no limit
 * @param {number} [now]
 * @returns {{ log: { free: number, changes: number[] }, retryAt?: number }}
 */
function checkChanges(saved, before, after, max, limit, now = Date.now()) {
  const ids = new Set(before.map((p) => p.id).filter(Boolean))
  const codes = new Set(before.map((p) => p.fc).filter(Boolean))
  const added = after.filter(
    (p) => !(p.id && ids.has(p.id)) && !(p.fc && codes.has(p.fc)),
  ).length
  const window = Math.max(0, Number(limit?.hours) || 0) * 60 * 60 * 1000
  // players saved before the limit existed used their free slots already
  const used = saved ? Math.max(0, Number(saved.free) || 0) : before.length
  const recent = (Array.isArray(saved?.changes) ? saved.changes : []).filter(
    (at) => Number.isFinite(at) && now - at < window,
  )
  const free = Math.min(added, Math.max(0, max - used))
  const changes = added - free
  const allowed = Math.max(0, Number(limit?.changes) || 0) * Math.max(1, max)
  if (allowed && window && changes && recent.length + changes > allowed) {
    // the oldest changes have to expire before these fit
    const sorted = [...recent, now].sort((x, y) => x - y)
    return {
      log: { free: used, changes: recent },
      retryAt:
        sorted[Math.max(0, recent.length + changes - allowed - 1)] + window,
    }
  }
  return {
    log: {
      free: used + free,
      changes: [...recent, ...Array(changes).fill(now)],
    },
  }
}

/**
 * Makes sure every active player id is linked in Poracle under its name and
 * unlinks the paused and removed ones, when the user's selected webhook is a
 * Poracle. Linking an id that is linked already only sets its label, so ids
 * saved before Poracle was synced get linked too.
 * @param {import('@rm/types').ExpressUser} user
 * @param {any} Event
 * @param {ShinyPlayer[]} before
 * @param {ShinyPlayer[]} after
 */
async function syncPoracle(user, Event, before, after) {
  // unlinking also works for a user who lost access to the webhook
  const canLink = !!user?.perms?.webhooks?.includes(user?.selectedWebhook)
  const webhook =
    user?.selectedWebhook && Event?.webhookObj?.[user.selectedWebhook]
  const key = syncKey(user)
  // nothing to sync with: not again until the hourly resync
  if (!webhook?.linkAccount || !webhookId(user)) {
    lastSynced.set(key, Date.now())
    return
  }
  // a paused player gets no alerts either, and neither do players past the
  // user's limit or any player of a user who lost the permission
  const allowed =
    canLink && user.perms?.personalShiny
      ? after.slice(0, getPersonalShinyMax(user.perms))
      : []
  const active = allowed.filter((p) => p.id && !p.paused)
  const activeIds = new Set(active.map((p) => p.id))
  const inactiveIds = new Set(
    [...before, ...after]
      .map((p) => p.id)
      .concat([...(pendingUnlinks.get(key) || [])])
      .filter((id) => id && !activeIds.has(id)),
  )
  // only a Poracle that reports per-player shiny tracking has the accounts;
  // one that doesn't right now (unreachable) gets the unlinks later
  if (!webhook.personalShiny) {
    if (inactiveIds.size) pendingUnlinks.set(key, inactiveIds)
    lastSynced.set(key, Date.now())
    return
  }
  lastSynced.set(key, Date.now())
  const [, unlinked] = await Promise.all([
    Promise.all(active.map((p) => webhook.linkAccount(user, p.id, p.name))),
    Promise.all(
      [...inactiveIds].map(async (id) => ({
        id,
        status: await webhook.unlinkAccount(user, id),
      })),
    ),
  ])
  // 2xx, or 404 (not linked / not registered): done; anything else again
  const failed = new Set(
    unlinked
      .filter(
        ({ status }) => !(status >= 200 && status < 300) && status !== 404,
      )
      .map(({ id }) => id),
  )
  // per id, so a sync running at the same time keeps its own failures
  const pending = pendingUnlinks.get(key) || new Set()
  unlinked.forEach(({ id }) =>
    failed.has(id) ? pending.add(id) : pending.delete(id),
  )
  if (pending.size) pendingUnlinks.set(key, pending)
  else pendingUnlinks.delete(key)
}

/**
 * The players saved for a user and the user with the webhook it has selected
 * now, both read from the database: another device's session may still name
 * the webhook the user left
 * @param {import('@rm/types').ExpressUser} user
 * @param {import('./DbManager')} Db
 * @returns {Promise<{ players: ShinyPlayer[], current: import('@rm/types').ExpressUser }>}
 */
async function readUser(user, Db) {
  const dbUser = await Db.query('User', 'getOne', user.id)
  const data =
    typeof dbUser?.data === 'string'
      ? JSON.parse(dbUser.data)
      : dbUser?.data || {}
  return {
    players: cleanPlayers(data.personalShiny),
    current: {
      ...user,
      selectedWebhook: dbUser?.selectedWebhook || user.selectedWebhook,
    },
  }
}

/**
 * Retries the unlinks that failed in webhooks the user selected before
 * @param {import('@rm/types').ExpressUser} user with the current webhook
 * @param {any} Event
 */
async function retryOldUnlinks(user, Event) {
  const prefix = `${user.id}|`
  await Promise.all(
    [...pendingUnlinks.entries()]
      .filter(([key]) => key.startsWith(prefix) && key !== syncKey(user))
      .map(async ([key, ids]) => {
        const webhook = Event?.webhookObj?.[key.slice(prefix.length)]
        if (!webhook?.unlinkAccount || !webhook.personalShiny) return
        await Promise.all(
          [...ids].map(async (id) => {
            const status = await webhook.unlinkAccount(user, id)
            if ((status >= 200 && status < 300) || status === 404) {
              ids.delete(id)
            }
          }),
        )
        if (!ids.size) pendingUnlinks.delete(key)
      }),
  )
}

/**
 * Moves the user's players to a newly selected webhook: they are unlinked in
 * the Poracle the user left, which ReactMap can still reach, and linked in the
 * new one right away instead of at the next hourly sync.
 * @param {import('@rm/types').ExpressUser} user with the new selectedWebhook
 * @param {import('./DbManager')} Db
 * @param {any} Event
 * @param {string | undefined} previous the webhook selected before
 */
async function moveWebhook(user, Db, Event, previous) {
  if (!user?.id || !previous || previous === user.selectedWebhook) return
  // queued with the user's saves, on the players as they are by then
  await queueSave(user.id, async () => {
    const { players, current } = await readUser(user, Db)
    if (!players.length || !webhookId(user)) return
    const old = Event?.webhookObj?.[previous]
    const oldKey = syncKey({ ...user, selectedWebhook: previous })
    const ids = players.map((p) => p.id).filter(Boolean)
    /** @type {Set<string>} unlinks in the old Poracle to retry later */
    const failed = new Set(pendingUnlinks.get(oldKey) || [])
    await Promise.all([
      ...(old?.unlinkAccount && old.personalShiny
        ? ids.map(async (id) => {
            const status = await old.unlinkAccount(user, id)
            if ((status >= 200 && status < 300) || status === 404) {
              failed.delete(id)
            } else failed.add(id)
          })
        : ids.map((id) => failed.add(id))),
      syncPoracle(current, Event, players, players),
    ])
    if (failed.size && old?.unlinkAccount) pendingUnlinks.set(oldKey, failed)
    else pendingUnlinks.delete(oldKey)
  })
}

/**
 * Looks up the player ids of the friend codes still waiting for one, saves
 * them and links them in Poracle. Runs in the background of a map request.
 * @param {import('@rm/types').ExpressUser} user
 * @param {import('./DbManager')} Db
 * @param {any} Event
 * @param {ShinyPlayer[]} players
 */
async function resolvePending(user, Db, Event, players) {
  if (resolving.has(user.id)) return
  resolving.add(user.id)
  try {
    const result = await playerIdLookup.resolvePlayers(players)
    if (!result.resolved) return
    // the user may have changed the players while the lookup ran, so only
    // what was found for friend codes that are still waiting is taken over;
    // queued with the user's own saves of the same data
    const before = new Map(players.map((player) => [player.fc, player]))
    const found = new Map(result.players.map((player) => [player.fc, player]))
    await queueSave(user.id, async () => {
      const dbUser = await Db.query('User', 'getOne', user.id)
      if (!dbUser) return
      const data =
        typeof dbUser.data === 'string'
          ? JSON.parse(dbUser.data)
          : dbUser.data || {}
      const current = cleanPlayers(data.personalShiny)
      const merged = current.map((player) => {
        const match = player.fc && !player.id ? found.get(player.fc) : null
        if (!match) return player
        const rest = { ...player }
        delete rest.lookup
        return {
          ...rest,
          ...(match.id ? { id: match.id } : {}),
          ...(match.trainer ? { trainer: match.trainer } : {}),
          ...(match.lookup ? { lookup: match.lookup } : {}),
          // a name the lookup gave is kept unless the user renamed it since
          name:
            player.name === before.get(player.fc)?.name
              ? match.name
              : player.name,
        }
      })
      data.personalShiny = merged
      await dbUser.$query().update({ data: JSON.stringify(data) })
      setCachedPlayers(user.id, merged)
      // in the queue, so a save after it can't be overtaken by these links;
      // with the webhook the user has selected now
      await syncPoracle(
        {
          ...user,
          selectedWebhook: dbUser.selectedWebhook || user.selectedWebhook,
        },
        Event,
        current,
        merged,
      )
    })
  } catch (e) {
    log.warn(TAGS.pokemon, 'personal shiny: friend code lookup failed', e)
  } finally {
    resolving.delete(user.id)
  }
}

/**
 * The players a user has configured, cached briefly to avoid a DB read on
 * every map move. Friend codes without a player id yet are looked up in the
 * background; until then those players have an empty id.
 * @param {import('@rm/types').ExpressUser | undefined} user
 * @param {import('./DbManager')} Db
 * @param {any} [Event]
 * @returns {Promise<ShinyPlayer[]>}
 */
async function getPlayers(user, Db, Event) {
  const userId = user?.id
  if (!userId) return []
  const cached = playerCache.get(userId)
  if (cached && Date.now() - cached.loaded < PLAYERS_TTL) return cached.players
  const dbUser = await Db.query('User', 'getOne', userId)
  const data =
    typeof dbUser?.data === 'string'
      ? JSON.parse(dbUser.data)
      : dbUser?.data || {}
  const players = cleanPlayers(data.personalShiny)
  playerCache.set(userId, { loaded: Date.now(), players })
  // a code whose lookup ended without an id waits until the user saves again
  if (
    playerIdLookup.enabled() &&
    players.some((p) => !p.id && p.fc && p.lookup !== 'failed')
  ) {
    resolvePending(user, Db, Event, players)
  }
  // also without players: unlinks that failed before are retried, in any
  // webhook the user has used
  if (
    (players.length || hasPendingUnlinks(user)) &&
    Date.now() - (lastSynced.get(syncKey(user)) || 0) > RESYNC_MS
  ) {
    resync(user, Db, Event)
  }
  return players
}

/**
 * Whether unlinks failed before for this user, in any webhook
 * @param {{ id?: number | string }} user
 */
function hasPendingUnlinks(user) {
  const prefix = `${user?.id}|`
  return [...pendingUnlinks.keys()].some((key) => key.startsWith(prefix))
}

/** Users whose hourly resync waits in their save queue */
const resyncQueued = new Set()

/**
 * The hourly Poracle resync, queued with the user's saves. The players are
 * read in the queue, so a save ahead of it can't be undone by stale ones.
 * @param {import('@rm/types').ExpressUser} user
 * @param {import('./DbManager')} Db
 * @param {any} Event
 */
function resync(user, Db, Event) {
  const key = syncKey(user)
  if (resyncQueued.has(key)) return
  resyncQueued.add(key)
  queueSave(user.id, async () => {
    if (Date.now() - (lastSynced.get(key) || 0) <= RESYNC_MS) return
    const { players, current } = await readUser(user, Db)
    if (players.length || pendingUnlinks.has(syncKey(current))) {
      await syncPoracle(current, Event, players, players)
    }
    // whatever couldn't be unlinked in a webhook the user left
    await retryOldUnlinks(current, Event)
    lastSynced.set(key, Date.now())
  })
    .catch((e) =>
      log.warn(TAGS.pokemon, 'personal shiny: Poracle sync failed', e),
    )
    .finally(() => resyncQueued.delete(key))
}

/**
 * For a user without the permission: the players they saved are unlinked in
 * Poracle (hourly at most), so a role that ran out stops the alerts too.
 * @param {import('@rm/types').ExpressUser | undefined} user
 * @param {import('./DbManager')} Db
 * @param {any} Event
 */
async function unlinkWithoutPerm(user, Db, Event) {
  if (!user?.id || user.perms?.personalShiny) return
  // its own timestamp: a user who gets the permission back is linked again
  // at once instead of after the hourly resync
  const key = syncKey(user)
  if (Date.now() - (lastUnlinked.get(key) || 0) <= RESYNC_MS) return
  lastUnlinked.set(key, Date.now())
  try {
    await queueSave(user.id, async () => {
      const { players, current } = await readUser(user, Db)
      if (players.length || pendingUnlinks.has(syncKey(current))) {
        await syncPoracle(current, Event, players, players)
        // not a resync: one that links runs as soon as the permission is back
        lastSynced.delete(key)
      }
      // and in webhooks the user left
      await retryOldUnlinks(current, Event)
    })
  } catch (e) {
    log.warn(TAGS.pokemon, 'personal shiny: Poracle unlink failed', e)
  }
}

/** @param {number | string} userId @param {ShinyPlayer[]} players */
function setCachedPlayers(userId, players) {
  playerCache.set(userId, { loaded: Date.now(), players })
}

/**
 * The timezone of the map's spawns, for rates that differ per timezone
 * @returns {string}
 */
function getTimezone() {
  return (
    config.getSafe('api.shinyRates.timezone') ||
    Intl.DateTimeFormat().resolvedOptions().timeZone
  )
}

/**
 * Whether the Pokémon takes the personal draws at all: wild, encountered or
 * from a tappable, not disguised (a Ditto Golbat knows of is the one disguise
 * that does)
 * @param {Partial<import('@rm/types').Pokemon>} pkmn
 * @returns {'ditto' | 'regular' | null}
 */
function rollKind(pkmn) {
  if (!pkmn?.id) return null
  if (pkmn.seen_type && !ELIGIBLE_SEEN_TYPES.has(pkmn.seen_type)) return null
  const disguised =
    !!pkmn.display_pokemon_id && pkmn.display_pokemon_id !== pkmn.pokemon_id
  if (pkmn.pokemon_id === DITTO_ID) return disguised ? 'ditto' : null
  return disguised ? null : 'regular'
}

/**
 * The shiny rate of a variant here, and whether it can be shiny at all, which
 * decides whether the game takes a shiny draw; only the base rate decides
 * that, a timezone override changes just the rate
 * @param {Partial<import('@rm/types').Pokemon>} pkmn
 * @param {Rates} rates
 * @returns {{ capable: boolean, rate: number }}
 */
function shinyRate(pkmn, rates) {
  const key = `${pkmn.pokemon_id}-${pkmn.form || 0}`
  const species = `${pkmn.pokemon_id}`
  const base = rates.has(key)
    ? rates.get(key)
    : rates.has(species)
      ? rates.get(species)
      : undefined
  if (base === 0) return { capable: false, rate: 0 }
  // without a rates service an unknown variant needs a shiny seen here;
  // without any rates nothing is predicted
  if (base === undefined && !rates.remote && !rates.seenShiny?.has(key)) {
    return { capable: false, rate: 0 }
  }
  const override = rates.overrides?.get(key)?.[getTimezone()]
  return {
    capable: true,
    rate: override ?? base ?? rates.fallback ?? DEFAULT_RATE,
  }
}

/**
 * The names of the players for whom the given draw is below the rate
 * @param {Partial<import('@rm/types').Pokemon>} pkmn
 * @param {ShinyPlayer[]} players
 * @param {number} index which draw
 * @param {number} rate
 * @returns {string[]}
 */
function playersBelow(pkmn, players, index, rate) {
  const names = []
  for (let i = 0; i < players.length; i += 1) {
    try {
      if (draws(pkmn.id, players[i].id, index + 1)[index] < rate) {
        names.push(players[i].name)
      }
    } catch (e) {
      return []
    }
  }
  return names
}

/**
 * Names of the players this Pokémon is shiny for (empty if none / not eligible).
 * @param {Partial<import('@rm/types').Pokemon>} pkmn
 * @param {ShinyPlayer[]} players
 * @param {Rates} rates
 * @returns {string[]}
 */
function shinyFor(pkmn, players, rates) {
  const kind = rollKind(pkmn)
  if (!kind) return []
  // a Ditto takes all three draws and is shiny on the third
  if (kind === 'ditto') return playersBelow(pkmn, players, 2, DITTO_RATE)
  const { capable, rate } = shinyRate(pkmn, rates)
  return capable && rate ? playersBelow(pkmn, players, 0, rate) : []
}

/**
 * Names of the players this Pokémon has a special background for: the draw
 * after the shiny draw (the first one when the variant can't be shiny),
 * against the background rate of the rates service
 * @param {Partial<import('@rm/types').Pokemon>} pkmn
 * @param {ShinyPlayer[]} players
 * @param {Rates} rates
 * @returns {string[]}
 */
function backgroundFor(pkmn, players, rates) {
  if (rollKind(pkmn) !== 'regular' || !rates.backgrounds?.size) return []
  const key = `${pkmn.pokemon_id}-${pkmn.form || 0}`
  const rate =
    rates.backgroundOverrides?.get(key)?.[getTimezone()] ??
    rates.backgrounds.get(key)
  if (!rate) return []
  return playersBelow(
    pkmn,
    players,
    shinyRate(pkmn, rates).capable ? 1 : 0,
    rate,
  )
}

/** @type {Map<number | string, Promise<unknown>>} user -> save in progress */
const saving = new Map()

/**
 * Runs a user's saves one after the other, so two saves at the same time
 * can't both pass the change limit or overwrite each other
 * @template T
 * @param {number | string} userId
 * @param {() => Promise<T>} task
 * @returns {Promise<T>}
 */
function queueSave(userId, task) {
  const next = (saving.get(userId) || Promise.resolve())
    .catch(() => {})
    .then(task)
  saving.set(userId, next)
  next
    .catch(() => {})
    .finally(() => {
      if (saving.get(userId) === next) saving.delete(userId)
    })
  return next
}

/**
 * Whether the loaded rates have any special background, without which none
 * can be predicted
 * @returns {boolean}
 */
function backgroundsKnown() {
  return !!rateCache?.rates?.backgrounds?.size
}

module.exports = {
  queueSave,
  backgroundsKnown,
  MAX_PLAYERS,
  shinyRoll,
  draws,
  backgroundFor,
  buildRates,
  parseRemoteRates,
  getRates,
  cleanPlayers,
  checkChanges,
  getPlayers,
  moveWebhook,
  setCachedPlayers,
  syncPoracle,
  shinyFor,
  unlinkWithoutPerm,
}
