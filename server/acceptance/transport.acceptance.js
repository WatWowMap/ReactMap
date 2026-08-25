// server/acceptance/transport.acceptance.js
//
// The eight acceptance criteria for the Transport plan
// (docs/superpowers/plans/2026-08-25-transport.md), written before any of the
// plan's other tasks change production code. Almost everything here is
// expected to be RED right now -- that is the point. Every later task in the
// plan is judged by which of these lines turn green, so nothing in this file
// may be weakened to make that easier.
//
// Rules this file follows, mirroring auth-flow.acceptance.js:
//   - Every assertion is made against a real HTTP response or a real
//     WebSocket message from a real, separately-running server process.
//     Nothing here imports server internals to check a return value.
//   - Every HTTP request carries an explicit client-side timeout and every
//     criterion checks elapsed time, not just status/content. Every
//     WebSocket wait carries an explicit timeout too; a message that never
//     arrives fails loudly as a hang, not a silent pass.
//   - Database access is only ever used to ARRANGE a precondition (sign a
//     user up) or to CLEAN UP what this run created. It is never the
//     assertion itself.
//
// ---------------------------------------------------------------------------
// Where today's system stands, and what that means for each criterion
// ---------------------------------------------------------------------------
// There is no Golbat client, no tRPC, no socket, and no map data of any kind
// on this branch yet (server/src/serve.js only knows /api/health,
// /api/auth/*, /api/settings and static files). Every criterion below is
// expected to fail today, and most will fail by hard connection/404 errors
// rather than a subtle assertion mismatch -- that IS red, and it is not
// weakened to look more specific than the current codebase supports.
//
// ---------------------------------------------------------------------------
// The Golbat problem, and what this file chose per criterion
// ---------------------------------------------------------------------------
// There is no Golbat instance and no Golbat credentials in this environment.
// This file runs a small fake Golbat (server/acceptance/support/fake-golbat-server.js)
// that speaks the real v3 pokemon scan, combined fort scan, and status
// response shapes, transcribed directly from Golbat's Go structs (cited at
// each use site below and in the fixture file itself). That fake is used for
// every criterion that needs Golbat to hold and change map data: 1, 2, 3, 4,
// 6 and 7. It exercises everything ReactMap does with a Golbat *response*,
// including `limit_reached` truncation handling and the
// expire_timestamp_verified distinction. It does NOT exercise whether
// ReactMap calls a real Golbat correctly -- request shape, auth headers,
// real network failure modes -- because there is no real Golbat here to
// check that against. That gap is real and is not hidden.
//
// Criterion 5 needs a Golbat *webhook* delivery, which is a different shape
// of problem: it is not "Golbat responds to a request we send", it is
// "Golbat's sender POSTs to a URL we exposed". So criterion 5 does not use
// the fake Golbat server at all. It POSTs a real webhook payload -- an array
// of `{type, message}`, exactly as golbat/webhooks/sender.go's
// `webhookMessage` (json tags `type`/`message`, with `Areas` excluded via
// `json:"-"`) marshals it -- directly at the endpoint this suite expects
// ReactMap's Task 6 to expose. That endpoint does not exist yet (Task 6 is
// task 6 of this plan), so this criterion is red until Task 6 lands, exactly
// as the plan predicts. The `message` payload for a raid change is Golbat's
// `RaidWebhook` struct (decoder/gym_state.go:165-195), sent under
// `type: "raid"` (webhooks/webhook.go's `webhookTypeToPayloadType[Raid] =
// "raid"`), which is what actually carries a raid change -- the generic
// `fort_update` "edit" hook (decoder/fort.go) only tracks name, description,
// image and location, not raid state.
//
// ---------------------------------------------------------------------------
// The wire contract this file assumes, and why it is a real, load-bearing
// choice rather than a guess to throw away
// ---------------------------------------------------------------------------
// Nothing on this branch has decided the tRPC HTTP mount path, the
// WebSocket upgrade path, or the exact subscribe/delta message shape yet --
// those are Task 5's job. This file has to assume something to be
// executable today, so it assumes the following, and documents it here so
// Task 5's implementer either conforms to it or updates this file in the
// same commit that changes the contract:
//   - WebSocket upgrade path: ws://<host>/api/ws
//   - Webhook receiver path (Task 6): POST /api/webhooks/golbat
//   - Golbat base URL is read by the server from the GOLBAT_API_URL
//     environment variable (mirroring how AUTHENTICATION_STRATEGIES already
//     seams into config/custom-environment-variables.json for the auth
//     suite). Task 2 needs to add a `golbat.apiUrl` config key wired to this
//     env var; nothing wires it yet, so setting it today is a no-op and
//     part of why criteria 1-4, 6 and 7 read as connection failures rather
//     than data mismatches.
//   - Subscribe message (client -> server): {"type":"subscribe","category":
//     "pokemon"|"gym","viewport":{"min":{"lat","lon"},"max":{"lat","lon"}},
//     "filters":[...]}. `filters` is Golbat's own v3 DNF clause array
//     (ApiPokemonDnfFilter3 / ApiFortDnfFilter) passed straight through --
//     since Task 3 (rules -> DNF translation) has not landed and there is no
//     rules table on this branch yet to seed a real rule row from, this
//     file declares what it wants directly in Golbat's own vocabulary,
//     matching the design doc's "the client declares what it needs once, at
//     subscribe time." Re-sending a subscribe message with a new viewport
//     is this file's assumed contract for "the client moved the map."
//   - Delta message (server -> client): {"type":"delta","category":
//     "pokemon"|"gym","added":[...],"changed":[...],"removed":[...ids]}.
//     Entities are Golbat's own response shapes (ApiPokemonResult /
//     ApiGymResult field names), again passed through rather than
//     invented, since nothing has decided a ReactMap-specific entity
//     projection yet.
//
// ---------------------------------------------------------------------------
// Criterion 8's WebSocket liveness definition
// ---------------------------------------------------------------------------
// Criterion 8 is "every response completes; nothing holds a connection
// open." For HTTP, that's the same timedFetch + elapsed-time check
// auth-flow.acceptance.js uses. A WebSocket has no single "response" to time,
// so this file checks three things that together are the WebSocket
// equivalent of "the connection completes rather than hanging":
//   1. The upgrade handshake itself completes (the 'open' event fires)
//      within the client timeout, rather than the TCP connection sitting
//      half-open.
//   2. A subscribe request gets an answer (some message arrives) within the
//      client timeout, exactly like an HTTP request needs a response body.
//   3. Closing the socket completes the close handshake (the 'close' event
//      fires) within the client timeout, rather than the server holding the
//      connection open after the client asked to leave -- the WebSocket
//      analogue of the compression-holds-the-response-open bug that
//      motivated this rule in the first place.
//
// ---------------------------------------------------------------------------
// How to run
// ---------------------------------------------------------------------------
// `bun run test:acceptance:transport` (see package.json). This file is
// intentionally separate from both bare `bun test` (the 306-test unit gate,
// which only auto-discovers *.test.*/*.spec.* files) and
// `bun run test:acceptance` (auth-flow.acceptance.js only, run by exact
// path) -- neither of those globs or paths picks this file up, so this
// suite cannot disturb either existing gate. Requires the same MySQL and
// .env setup as auth-flow.acceptance.js.

require('dotenv').config()

const path = require('path')
const crypto = require('crypto')
const mysql = require('mysql2/promise')
const { test, expect, describe, beforeAll, afterAll } = require('bun:test')
const { startFakeGolbat } = require('./support/fake-golbat-server')

const REPO_ROOT = path.join(__dirname, '..', '..')

// Distinct from auth-flow.acceptance.js's 18234, so the two suites can run
// concurrently without colliding.
const TEST_PORT = 18236
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`
const WS_URL = `ws://127.0.0.1:${TEST_PORT}/api/ws`

const CLIENT_TIMEOUT_MS = 5_000
const HANG_THRESHOLD_MS = 2_000
// How long this file waits for a poll-driven WebSocket message before
// calling it a hang. Generous relative to HANG_THRESHOLD_MS because a delta
// engine (Task 4/5) is expected to be poll-cycle driven rather than
// sub-100ms, but still a real ceiling: a message that never arrives inside
// this window fails the test with a "did not arrive" error, not a silent
// skip.
const WS_WAIT_MS = 20_000
// How long this file watches for a message it expects NOT to see (used by
// criteria 4 and 6, where the assertion is an absence).
const WS_QUIET_WINDOW_MS = 6_000

const RUN_ID = crypto.randomBytes(4).toString('hex')
const emailFor = (label) =>
  `transport-${RUN_ID}-${label}@users.noreply.reactmap.invalid`
const usernameFor = (label) => `transport-${RUN_ID}-${label}`

/** @type {import('bun').Subprocess | null} */
let serverProcess = null
/** @type {import('mysql2/promise').Connection | null} */
let db = null
/** @type {ReturnType<typeof startFakeGolbat> | null} */
let fakeGolbat = null

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * fetch with an explicit abort timeout and elapsed-time measurement, same
 * contract as auth-flow.acceptance.js's timedFetch.
 */
async function timedFetch(url, options = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS)
  const start = performance.now()
  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    const text = await response.text()
    const elapsedMs = performance.now() - start
    let json
    try {
      json = text ? JSON.parse(text) : undefined
    } catch {
      json = undefined
    }
    return { response, text, json, elapsedMs }
  } catch (e) {
    const elapsedMs = performance.now() - start
    if (e?.name === 'AbortError') {
      throw new Error(
        `${url} did not complete within ${CLIENT_TIMEOUT_MS}ms (elapsed ${elapsedMs.toFixed(0)}ms). ` +
          'This is a hang, not a slow response.',
      )
    }
    throw e
  } finally {
    clearTimeout(timer)
  }
}

function getSessionCookie(response) {
  const raw = response.headers.get('set-cookie')
  if (!raw) return null
  const [pair] = raw.split(';')
  return pair
}

async function waitForServerReady(maxWaitMs) {
  const deadline = Date.now() + maxWaitMs
  let lastError
  while (Date.now() < deadline) {
    try {
      const { response } = await timedFetch(`${BASE_URL}/api/health`)
      if (response.status === 200) return
    } catch (e) {
      lastError = e
    }
    await sleep(300)
  }
  throw new Error(
    `Server did not become ready on ${BASE_URL} within ${maxWaitMs}ms. Last error: ${lastError}`,
  )
}

/** Signs a fresh user up, signs them in, and returns their session cookie. */
async function signUpAndSignIn(label) {
  const username = usernameFor(label)
  const password = `correct horse battery staple ${label}`
  await timedFetch(`${BASE_URL}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: emailFor(label),
      password,
      name: username,
      username,
    }),
  })
  const signIn = await timedFetch(`${BASE_URL}/api/auth/sign-in/username`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  return getSessionCookie(signIn.response)
}

/**
 * Thin wrapper around a real WebSocket connection. Buffers every parsed
 * message it receives from the moment it is constructed (so nothing is lost
 * between "connect" and "start waiting"), and exposes `mark`/`waitForSince`/
 * `noMatchSince` so a test can assert on messages relative to an action it
 * just took, rather than the whole connection's history.
 */
class SocketClient {
  constructor(cookie) {
    this.ws = new WebSocket(WS_URL, {
      headers: cookie ? { Cookie: cookie } : {},
    })
    /** @type {Array<{data: any, at: number}>} */
    this.received = []
    this.ws.addEventListener('message', (ev) => {
      let data
      try {
        data = JSON.parse(ev.data)
      } catch {
        data = ev.data
      }
      this.received.push({ data, at: performance.now() })
    })
  }

  /** Waits for the upgrade handshake to complete, or fails with elapsed time. */
  async waitForOpen(timeoutMs = CLIENT_TIMEOUT_MS) {
    const start = performance.now()
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup()
        reject(
          new Error(
            `WebSocket to ${WS_URL} did not open within ${timeoutMs}ms ` +
              `(elapsed ${(performance.now() - start).toFixed(0)}ms).`,
          ),
        )
      }, timeoutMs)
      const onOpen = () => {
        cleanup()
        resolve()
      }
      const onError = () => {
        cleanup()
        reject(new Error(`WebSocket to ${WS_URL} errored before opening.`))
      }
      const cleanup = () => {
        clearTimeout(timer)
        this.ws.removeEventListener('open', onOpen)
        this.ws.removeEventListener('error', onError)
      }
      this.ws.addEventListener('open', onOpen)
      this.ws.addEventListener('error', onError)
    })
    return performance.now() - start
  }

  send(obj) {
    this.ws.send(JSON.stringify(obj))
  }

  /** A marker into this connection's message history, for use with the methods below. */
  mark() {
    return this.received.length
  }

  /** Polls until a message matching `predicate`, received at or after `markIdx`, shows up. */
  async waitForSince(markIdx, predicate, timeoutMs, label) {
    const deadline = performance.now() + timeoutMs
    while (performance.now() < deadline) {
      const hit = this.received
        .slice(markIdx)
        .find((entry) => predicate(entry.data))
      if (hit) return hit.data
      await sleep(50)
    }
    throw new Error(
      `${label} did not arrive within ${timeoutMs}ms. This is a hang/never-arrives ` +
        `failure, not a content mismatch.`,
    )
  }

  /** Watches for `windowMs` and fails if any message matching `predicate` shows up. */
  async noMatchSince(markIdx, predicate, windowMs, label) {
    const deadline = performance.now() + windowMs
    while (performance.now() < deadline) {
      const hit = this.received
        .slice(markIdx)
        .find((entry) => predicate(entry.data))
      if (hit) {
        throw new Error(
          `${label}: unexpected message arrived: ${JSON.stringify(hit.data)}`,
        )
      }
      await sleep(100)
    }
    return true
  }

  /** Closes the socket and waits for the close handshake to complete. */
  async closeAndWait(timeoutMs = CLIENT_TIMEOUT_MS) {
    const start = performance.now()
    const closed = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(
          new Error(
            `WebSocket close handshake did not complete within ${timeoutMs}ms -- ` +
              `the server is holding the connection open after the client asked to leave.`,
          ),
        )
      }, timeoutMs)
      this.ws.addEventListener(
        'close',
        () => {
          clearTimeout(timer)
          resolve()
        },
        { once: true },
      )
    })
    this.ws.close()
    await closed
    return performance.now() - start
  }
}

// ---------------------------------------------------------------------------
// Pokemon/gym fixtures, shaped exactly like Golbat's own JSON encoder would
// produce them.
// ---------------------------------------------------------------------------

/** decoder/api_pokemon_response.go:41-79 (ApiPokemonResult json tags). */
function fixturePokemon({
  id,
  pokemonId,
  lat,
  lon,
  expireTimestamp,
  verified,
}) {
  const nowSec = Math.floor(Date.now() / 1000)
  return {
    id,
    pokestop_id: null,
    spawn_id: null,
    lat,
    lon,
    weight: null,
    size: null,
    height: null,
    expire_timestamp: expireTimestamp,
    updated: nowSec,
    pokemon_id: pokemonId,
    move_1: null,
    move_2: null,
    gender: null,
    cp: null,
    atk_iv: null,
    def_iv: null,
    sta_iv: null,
    iv: null,
    form: null,
    level: null,
    weather: null,
    costume: null,
    first_seen_timestamp: nowSec,
    changed: nowSec,
    cell_id: null,
    expire_timestamp_verified: verified,
    display_pokemon_id: null,
    display_pokemon_form: null,
    is_ditto: false,
    seen_type: 'wild',
    shiny: false,
    username: null,
    capture_1: null,
    capture_2: null,
    capture_3: null,
    pvp: {},
    is_event: 0,
  }
}

/** golbat/decoder/gym_state.go:165-195 (RaidWebhook json tags). */
function fixtureRaidWebhookMessage({ gymId, level, pokemonId }) {
  const nowSec = Math.floor(Date.now() / 1000)
  return {
    gym_id: gymId,
    gym_name: 'Fixture Gym',
    gym_url: 'https://example.invalid/gym.png',
    latitude: 12.34,
    longitude: 56.78,
    team_id: 1,
    spawn: nowSec,
    start: nowSec,
    end: nowSec + 2700,
    level,
    pokemon_id: pokemonId,
    cp: 12345,
    gender: 1,
    form: 0,
    alignment: 0,
    costume: 0,
    evolution: 0,
    move_1: 200,
    move_2: 13,
    ex_raid_eligible: 0,
    is_exclusive: 0,
    sponsor_id: 0,
    partner_id: '',
    power_up_points: 0,
    power_up_level: 0,
    power_up_end_timestamp: 0,
    ar_scan_eligible: 1,
    rsvps: null,
    raid_seed: null,
  }
}

beforeAll(async () => {
  db = await mysql.createConnection({
    host: process.env.REACT_MAP_DB_HOST,
    port: Number(process.env.REACT_MAP_DB_PORT),
    user: process.env.REACT_MAP_DB_USERNAME,
    password: process.env.REACT_MAP_DB_PASSWORD,
    database: process.env.REACT_MAP_DB_NAME,
  })

  fakeGolbat = startFakeGolbat()

  serverProcess = Bun.spawn({
    cmd: ['bun', 'server/src/serve.js'],
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      PORT: String(TEST_PORT),
      INTERFACE: '127.0.0.1',
      AUTHENTICATION_STRATEGIES: JSON.stringify([
        { name: 'local', type: 'local', enabled: true },
      ]),
      // See header comment: this env var has no reader yet on this branch.
      // It is the seam Task 2 is expected to wire up.
      GOLBAT_API_URL: fakeGolbat.url,
      DEV_OPTIONS_SKIP_UPDATE_CHECK: 'true',
    },
    stdout: 'pipe',
    stderr: 'pipe',
  })

  await waitForServerReady(45_000)
}, 60_000)

afterAll(async () => {
  if (serverProcess) {
    serverProcess.kill()
    await serverProcess.exited
  }
  if (fakeGolbat) {
    fakeGolbat.close()
  }
  if (db) {
    await db.query(
      `DELETE FROM auth_session WHERE user_id IN (SELECT id FROM auth_user WHERE email LIKE ?)`,
      [`transport-${RUN_ID}-%`],
    )
    await db.query(
      `DELETE FROM auth_account WHERE user_id IN (SELECT id FROM auth_user WHERE email LIKE ?)`,
      [`transport-${RUN_ID}-%`],
    )
    await db.query(
      `DELETE FROM user_perms WHERE user_id IN (SELECT id FROM auth_user WHERE email LIKE ?)`,
      [`transport-${RUN_ID}-%`],
    )
    await db.query(`DELETE FROM auth_user WHERE email LIKE ?`, [
      `transport-${RUN_ID}-%`,
    ])
    await db.end()
  }
}, 30_000)

const WORLD_VIEWPORT = {
  min: { lat: -90, lon: -180 },
  max: { lat: 90, lon: 180 },
}

// ---------------------------------------------------------------------------
// Criterion 1: a signed-in client subscribing to a viewport receives an
// initial set of Pokemon matching its rules.
// ---------------------------------------------------------------------------
describe('criterion 1: initial subscribe yields only matching pokemon', () => {
  test(
    'a client subscribing with a species filter receives the matching pokemon and not the non-matching one',
    async () => {
      fakeGolbat.setPokemonHandler(() => ({
        pokemon: [
          fixturePokemon({
            id: 'c1-match',
            pokemonId: 1,
            lat: 40,
            lon: 40,
            expireTimestamp: Math.floor(Date.now() / 1000) + 3600,
            verified: true,
          }),
          fixturePokemon({
            id: 'c1-no-match',
            pokemonId: 99,
            lat: 40,
            lon: 40,
            expireTimestamp: Math.floor(Date.now() / 1000) + 3600,
            verified: true,
          }),
        ],
        examined: 2,
        skipped: 0,
        total: 2,
        limit_reached: false,
      }))

      const cookie = await signUpAndSignIn('c1')
      const client = new SocketClient(cookie)
      await client.waitForOpen()

      const start = performance.now()
      client.send({
        type: 'subscribe',
        category: 'pokemon',
        viewport: WORLD_VIEWPORT,
        filters: [{ pokemon: [{ id: 1 }] }],
      })

      const delta = await client.waitForSince(
        0,
        (msg) =>
          msg?.type === 'delta' &&
          msg?.category === 'pokemon' &&
          Array.isArray(msg.added) &&
          msg.added.some((p) => p.pokemon_id === 1),
        WS_WAIT_MS,
        'criterion 1: initial delta containing the matching pokemon',
      )
      expect(performance.now() - start).toBeLessThan(WS_WAIT_MS)
      expect(delta.added.some((p) => p.pokemon_id === 99)).toBe(false)

      await client.closeAndWait()
    },
    WS_WAIT_MS + CLIENT_TIMEOUT_MS,
  )
})

// ---------------------------------------------------------------------------
// Criterion 2: moving the viewport yields entities for the new area and
// drops those no longer in it.
// ---------------------------------------------------------------------------
describe('criterion 2: moving the viewport swaps what the client sees', () => {
  const REGION_A = { min: { lat: 10, lon: 10 }, max: { lat: 11, lon: 11 } }
  const REGION_B = { min: { lat: 50, lon: 50 }, max: { lat: 51, lon: 51 } }

  test(
    'entities from the old viewport are dropped and entities from the new one arrive',
    async () => {
      fakeGolbat.setPokemonHandler((body) => {
        const inRegionB = (body?.min?.lat ?? 0) >= 30
        const entity = inRegionB
          ? fixturePokemon({
              id: 'c2-region-b',
              pokemonId: 20,
              lat: 50.5,
              lon: 50.5,
              expireTimestamp: Math.floor(Date.now() / 1000) + 3600,
              verified: true,
            })
          : fixturePokemon({
              id: 'c2-region-a',
              pokemonId: 10,
              lat: 10.5,
              lon: 10.5,
              expireTimestamp: Math.floor(Date.now() / 1000) + 3600,
              verified: true,
            })
        return {
          pokemon: [entity],
          examined: 1,
          skipped: 0,
          total: 1,
          limit_reached: false,
        }
      })

      const cookie = await signUpAndSignIn('c2')
      const client = new SocketClient(cookie)
      await client.waitForOpen()

      client.send({
        type: 'subscribe',
        category: 'pokemon',
        viewport: REGION_A,
        filters: [],
      })
      await client.waitForSince(
        0,
        (msg) =>
          msg?.type === 'delta' &&
          msg?.category === 'pokemon' &&
          (msg.added || []).some((p) => p.id === 'c2-region-a'),
        WS_WAIT_MS,
        'criterion 2: initial delta from region A',
      )

      const mark = client.mark()
      client.send({
        type: 'subscribe',
        category: 'pokemon',
        viewport: REGION_B,
        filters: [],
      })

      await client.waitForSince(
        mark,
        (msg) =>
          msg?.type === 'delta' &&
          msg?.category === 'pokemon' &&
          (msg.added || []).some((p) => p.id === 'c2-region-b'),
        WS_WAIT_MS,
        'criterion 2: delta with the new region B entity',
      )
      await client.waitForSince(
        mark,
        (msg) =>
          msg?.type === 'delta' &&
          msg?.category === 'pokemon' &&
          (msg.removed || []).includes('c2-region-a'),
        WS_WAIT_MS,
        'criterion 2: explicit removal of the region A entity that left the viewport',
      )

      await client.closeAndWait()
    },
    2 * WS_WAIT_MS + CLIENT_TIMEOUT_MS,
  )
})

// ---------------------------------------------------------------------------
// Criterion 3: a Pokemon appearing upstream reaches an already-subscribed
// client without it asking.
// ---------------------------------------------------------------------------
describe('criterion 3: an upstream addition reaches an already-subscribed client unprompted', () => {
  test(
    'a pokemon that appears in a later Golbat poll arrives on the socket with no further client message',
    async () => {
      let pokemonInWorld = []
      fakeGolbat.setPokemonHandler(() => ({
        pokemon: pokemonInWorld,
        examined: pokemonInWorld.length,
        skipped: 0,
        total: pokemonInWorld.length,
        limit_reached: false,
      }))

      const cookie = await signUpAndSignIn('c3')
      const client = new SocketClient(cookie)
      await client.waitForOpen()

      client.send({
        type: 'subscribe',
        category: 'pokemon',
        viewport: WORLD_VIEWPORT,
        filters: [],
      })
      await client.waitForSince(
        0,
        (msg) => msg?.type === 'delta' && msg?.category === 'pokemon',
        WS_WAIT_MS,
        'criterion 3: initial (empty) delta acknowledging the subscription',
      )

      const mark = client.mark()
      pokemonInWorld = [
        fixturePokemon({
          id: 'c3-new',
          pokemonId: 77,
          lat: 1,
          lon: 1,
          expireTimestamp: Math.floor(Date.now() / 1000) + 3600,
          verified: true,
        }),
      ]

      // Deliberately no further client.send() -- this is the "without it
      // asking" half of the criterion.
      await client.waitForSince(
        mark,
        (msg) =>
          msg?.type === 'delta' &&
          msg?.category === 'pokemon' &&
          (msg.added || []).some((p) => p.id === 'c3-new'),
        WS_WAIT_MS,
        'criterion 3: unprompted delta for the newly-appeared pokemon',
      )

      await client.closeAndWait()
    },
    WS_WAIT_MS + CLIENT_TIMEOUT_MS,
  )
})

// ---------------------------------------------------------------------------
// Criterion 4: a verified-expiry pokemon disappears with no server message;
// an unverified-expiry one does not get evicted just because its guessed
// time passed.
// ---------------------------------------------------------------------------
describe('criterion 4: verified expiries evict silently, unverified ones do not self-evict', () => {
  test(
    'a verified expiry gets no explicit removal message, and an unverified one is not dropped when its guess passes',
    async () => {
      const nowSec = () => Math.floor(Date.now() / 1000)
      const verifiedExpiry = nowSec() + 2
      const unverifiedGuess = nowSec() + 2

      fakeGolbat.setPokemonHandler(() => {
        const t = nowSec()
        const results = []
        // Mirrors decoder/api_pokemon_response.go:197 (collectApiPokemonResults):
        // Golbat itself filters out anything past its expire_timestamp.
        if (t < verifiedExpiry) {
          results.push(
            fixturePokemon({
              id: 'c4-verified',
              pokemonId: 30,
              lat: 2,
              lon: 2,
              expireTimestamp: verifiedExpiry,
              verified: true,
            }),
          )
        }
        // Mirrors Golbat extending an unverified guess while the spawn is
        // still seen: once the original guess passes, a real Golbat would
        // still be returning this entity with a pushed-out expiry, not
        // dropping it.
        const stillGuessing = t < unverifiedGuess
        results.push(
          fixturePokemon({
            id: 'c4-unverified',
            pokemonId: 31,
            lat: 2,
            lon: 2,
            expireTimestamp: stillGuessing
              ? unverifiedGuess
              : unverifiedGuess + 1200,
            verified: false,
          }),
        )
        return {
          pokemon: results,
          examined: results.length,
          skipped: 0,
          total: results.length,
          limit_reached: false,
        }
      })

      const cookie = await signUpAndSignIn('c4')
      const client = new SocketClient(cookie)
      await client.waitForOpen()

      client.send({
        type: 'subscribe',
        category: 'pokemon',
        viewport: WORLD_VIEWPORT,
        filters: [],
      })
      await client.waitForSince(
        0,
        (msg) =>
          msg?.type === 'delta' &&
          msg?.category === 'pokemon' &&
          (msg.added || []).some((p) => p.id === 'c4-verified') &&
          (msg.added || []).some((p) => p.id === 'c4-unverified'),
        WS_WAIT_MS,
        'criterion 4: initial delta with both the verified and unverified entities',
      )

      const mark = client.mark()
      // Wait past both timestamps for real -- this is an integration test
      // against a real clock, not a mocked one.
      await sleep(2_500)

      await client.noMatchSince(
        mark,
        (msg) =>
          msg?.type === 'delta' &&
          Array.isArray(msg.removed) &&
          msg.removed.includes('c4-verified'),
        WS_QUIET_WINDOW_MS,
        "criterion 4: a verified-expiry pokemon must disappear on the client's own clock, " +
          'not via an explicit server removal message',
      )

      await client.noMatchSince(
        mark,
        (msg) =>
          msg?.type === 'delta' &&
          Array.isArray(msg.removed) &&
          msg.removed.includes('c4-unverified'),
        WS_QUIET_WINDOW_MS,
        'criterion 4: an unverified-expiry pokemon must not be evicted just because its ' +
          'originally-guessed expiry passed',
      )

      await client.closeAndWait()
    },
    WS_WAIT_MS + 2 * WS_QUIET_WINDOW_MS + CLIENT_TIMEOUT_MS,
  )
})

// ---------------------------------------------------------------------------
// Criterion 5: a gym whose raid changes reaches the client from a Golbat
// webhook, not a poll.
// ---------------------------------------------------------------------------
describe('criterion 5: a raid change reaches the client via webhook, not a poll', () => {
  const GYM_ID = `c5-gym-${RUN_ID}`

  test(
    'posting a real Golbat raid webhook payload delivers a gym delta without an intervening fort poll',
    async () => {
      // fort/scan stays empty throughout -- if the client ever saw the raid
      // via a poll instead of the webhook, it could only be because this
      // handler is what served it, and the request log assertion below
      // catches that.
      fakeGolbat.setFortHandler(() => ({
        gyms: [],
        pokestops: [],
        stations: [],
        examined: 0,
        skipped: 0,
        total: 0,
        limit_reached: false,
      }))

      const cookie = await signUpAndSignIn('c5')
      const client = new SocketClient(cookie)
      await client.waitForOpen()

      client.send({
        type: 'subscribe',
        category: 'gym',
        viewport: WORLD_VIEWPORT,
        filters: [],
      })
      const mark = client.mark()

      fakeGolbat.resetRequestLog()
      const postedAt = Date.now()

      // golbat/webhooks/sender.go:21-25 (webhookMessage): `[]{"type":
      // "raid","message": <RaidWebhook>}`. `Areas` carries `json:"-"` and is
      // never on the wire.
      const webhookPayload = [
        {
          type: 'raid',
          message: fixtureRaidWebhookMessage({
            gymId: GYM_ID,
            level: 5,
            pokemonId: 150,
          }),
        },
      ]

      const post = await timedFetch(`${BASE_URL}/api/webhooks/golbat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload),
      })
      expect(post.response.status).toBeGreaterThanOrEqual(200)
      expect(post.response.status).toBeLessThan(300)
      expect(post.elapsedMs).toBeLessThan(HANG_THRESHOLD_MS)

      const delta = await client.waitForSince(
        mark,
        (msg) =>
          msg?.type === 'delta' &&
          msg?.category === 'gym' &&
          (msg.added || [])
            .concat(msg.changed || [])
            .some((g) => g.id === GYM_ID),
        WS_WAIT_MS,
        'criterion 5: gym delta reflecting the webhook-delivered raid change',
      )
      const gym = delta.added
        .concat(delta.changed || [])
        .find((g) => g.id === GYM_ID)
      expect(gym.raid_level).toBe(5)
      expect(gym.raid_pokemon_id).toBe(150)

      const fortScanCallsSinceWebhook = fakeGolbat
        .getRequestLog()
        .filter(
          (entry) => entry.path === '/api/fort/scan' && entry.at >= postedAt,
        )
      expect(fortScanCallsSinceWebhook.length).toBe(0)

      await client.closeAndWait()
    },
    WS_WAIT_MS + 2 * CLIENT_TIMEOUT_MS,
  )
})

// ---------------------------------------------------------------------------
// Criterion 6: a truncated response never causes a live entity to be
// evicted.
// ---------------------------------------------------------------------------
describe('criterion 6: limit_reached suppresses reconciliation eviction', () => {
  test(
    'an entity dropped from a limit_reached:true response is not evicted from the client',
    async () => {
      let truncated = false
      fakeGolbat.setPokemonHandler(() => {
        if (!truncated) {
          return {
            pokemon: [
              fixturePokemon({
                id: 'c6-live',
                pokemonId: 40,
                lat: 3,
                lon: 3,
                expireTimestamp: Math.floor(Date.now() / 1000) + 3600,
                verified: true,
              }),
            ],
            examined: 1,
            skipped: 0,
            total: 1,
            limit_reached: false,
          }
        }
        // A truncated response that omits the still-live entity entirely --
        // the shape Golbat produces when the cap is hit before this entity
        // was examined.
        return {
          pokemon: [],
          examined: 3000,
          skipped: 0,
          total: 5000,
          limit_reached: true,
        }
      })

      const cookie = await signUpAndSignIn('c6')
      const client = new SocketClient(cookie)
      await client.waitForOpen()

      client.send({
        type: 'subscribe',
        category: 'pokemon',
        viewport: WORLD_VIEWPORT,
        filters: [],
      })
      await client.waitForSince(
        0,
        (msg) =>
          msg?.type === 'delta' &&
          msg?.category === 'pokemon' &&
          (msg.added || []).some((p) => p.id === 'c6-live'),
        WS_WAIT_MS,
        'criterion 6: initial delta with the live entity',
      )

      const mark = client.mark()
      truncated = true

      await client.noMatchSince(
        mark,
        (msg) =>
          msg?.type === 'delta' &&
          Array.isArray(msg.removed) &&
          msg.removed.includes('c6-live'),
        WS_QUIET_WINDOW_MS,
        'criterion 6: a limit_reached:true response must never evict a live entity it merely omitted',
      )

      await client.closeAndWait()
    },
    WS_WAIT_MS + WS_QUIET_WINDOW_MS + CLIENT_TIMEOUT_MS,
  )
})

// ---------------------------------------------------------------------------
// Criterion 7: two clients with different rules on the same viewport each
// receive only what their own rules match.
// ---------------------------------------------------------------------------
describe('criterion 7: per-connection filtering isolates two clients on the same viewport', () => {
  test(
    'client A only sees species 1, client B only sees species 4, on the identical viewport',
    async () => {
      fakeGolbat.setPokemonHandler(() => ({
        pokemon: [
          fixturePokemon({
            id: 'c7-species-1',
            pokemonId: 1,
            lat: 4,
            lon: 4,
            expireTimestamp: Math.floor(Date.now() / 1000) + 3600,
            verified: true,
          }),
          fixturePokemon({
            id: 'c7-species-4',
            pokemonId: 4,
            lat: 4,
            lon: 4,
            expireTimestamp: Math.floor(Date.now() / 1000) + 3600,
            verified: true,
          }),
        ],
        examined: 2,
        skipped: 0,
        total: 2,
        limit_reached: false,
      }))

      const cookieA = await signUpAndSignIn('c7a')
      const cookieB = await signUpAndSignIn('c7b')
      const clientA = new SocketClient(cookieA)
      const clientB = new SocketClient(cookieB)
      await Promise.all([clientA.waitForOpen(), clientB.waitForOpen()])

      clientA.send({
        type: 'subscribe',
        category: 'pokemon',
        viewport: WORLD_VIEWPORT,
        filters: [{ pokemon: [{ id: 1 }] }],
      })
      clientB.send({
        type: 'subscribe',
        category: 'pokemon',
        viewport: WORLD_VIEWPORT,
        filters: [{ pokemon: [{ id: 4 }] }],
      })

      const deltaA = await clientA.waitForSince(
        0,
        (msg) =>
          msg?.type === 'delta' &&
          msg?.category === 'pokemon' &&
          (msg.added || []).some((p) => p.id === 'c7-species-1'),
        WS_WAIT_MS,
        'criterion 7: client A delta with species 1',
      )
      const deltaB = await clientB.waitForSince(
        0,
        (msg) =>
          msg?.type === 'delta' &&
          msg?.category === 'pokemon' &&
          (msg.added || []).some((p) => p.id === 'c7-species-4'),
        WS_WAIT_MS,
        'criterion 7: client B delta with species 4',
      )

      expect(deltaA.added.some((p) => p.id === 'c7-species-4')).toBe(false)
      expect(deltaB.added.some((p) => p.id === 'c7-species-1')).toBe(false)

      await Promise.all([clientA.closeAndWait(), clientB.closeAndWait()])
    },
    2 * WS_WAIT_MS + CLIENT_TIMEOUT_MS,
  )
})

// ---------------------------------------------------------------------------
// Criterion 8: every response completes; nothing holds a connection open.
// See the header comment for the WebSocket liveness definition this uses.
// ---------------------------------------------------------------------------
describe('criterion 8: every response completes, over HTTP and over the socket', () => {
  test(
    'the WebSocket upgrade handshake completes within the client timeout',
    async () => {
      const cookie = await signUpAndSignIn('c8open')
      const client = new SocketClient(cookie)
      const elapsedMs = await client.waitForOpen(CLIENT_TIMEOUT_MS)
      expect(elapsedMs).toBeLessThan(HANG_THRESHOLD_MS)
      await client.closeAndWait()
    },
    CLIENT_TIMEOUT_MS * 2,
  )

  test(
    'a subscribe request gets an answer within the client timeout, not silence',
    async () => {
      fakeGolbat.setPokemonHandler(() => ({
        pokemon: [],
        examined: 0,
        skipped: 0,
        total: 0,
        limit_reached: false,
      }))
      const cookie = await signUpAndSignIn('c8answer')
      const client = new SocketClient(cookie)
      await client.waitForOpen()

      const start = performance.now()
      client.send({
        type: 'subscribe',
        category: 'pokemon',
        viewport: WORLD_VIEWPORT,
        filters: [],
      })
      await client.waitForSince(
        0,
        (msg) => msg?.type === 'delta',
        WS_WAIT_MS,
        'criterion 8: an answer to the subscribe request',
      )
      expect(performance.now() - start).toBeLessThan(WS_WAIT_MS)

      await client.closeAndWait()
    },
    WS_WAIT_MS + CLIENT_TIMEOUT_MS,
  )

  test(
    'closing the socket completes the close handshake within the client timeout',
    async () => {
      const cookie = await signUpAndSignIn('c8close')
      const client = new SocketClient(cookie)
      await client.waitForOpen()
      const elapsedMs = await client.closeAndWait(CLIENT_TIMEOUT_MS)
      expect(elapsedMs).toBeLessThan(HANG_THRESHOLD_MS)
    },
    CLIENT_TIMEOUT_MS * 2,
  )

  test('the Golbat webhook receiver responds and completes within the client timeout', async () => {
    const post = await timedFetch(`${BASE_URL}/api/webhooks/golbat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([
        {
          type: 'raid',
          message: fixtureRaidWebhookMessage({
            gymId: 'c8-webhook-gym',
            level: 1,
            pokemonId: 1,
          }),
        },
      ]),
    })
    expect(post.elapsedMs).toBeLessThan(HANG_THRESHOLD_MS)
  })
})
