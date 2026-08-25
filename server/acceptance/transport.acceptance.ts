// server/acceptance/transport.acceptance.ts
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
//     "pokemon"|"gym","viewport":{"min":{"lat","lon"},"max":{"lat","lon"}}}.
//     Re-sending a subscribe message with a new viewport is this file's
//     assumed contract for "the client moved the map."
//
//     This message carried a `filters` array until the filters plan's Task
//     6, which is the change that updated this section. `filters` was
//     Golbat's own v3 DNF clause array (ApiPokemonDnfFilter3 /
//     ApiFortDnfFilter) passed straight through, because there was no rules
//     table on the branch yet to seed a real rule from. There is one now, so
//     what a subscription shows comes from the signed-in user's own rules
//     and a `filters` field on the message is ignored -- a client that could
//     name its own Golbat filters could ask for whatever it liked, whatever
//     its rules say. The two criteria below that needed a narrow filter
//     (1 and 7) now write a real rule over `rules.*` first, which is also a
//     truer test: it exercises the path a browser will actually take.
//   - Delta message (server -> client): {"type":"delta","category":
//     "pokemon"|"gym","rulesVersion":N,"added":[...],"changed":[...],
//     "removed":[...ids]}. Entities are Golbat's own response shapes
//     (ApiPokemonResult / ApiGymResult field names), passed through rather
//     than invented, plus one field this server adds: `matched`, the ids of
//     the rules that matched that entity. `rulesVersion` is the profile's
//     `rules_version` the delta was computed against, so an open map can
//     notice that its cached rules went stale.
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

import 'dotenv/config'

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import crypto from 'crypto'
import mysql from 'mysql2/promise'
import path from 'path'
import { startFakeGolbat } from './support/fake-golbat-server'
import {
  AcceptanceSocketClient,
  CLIENT_TIMEOUT_MS,
  createAuthHelpers,
  fixturePokemon,
  fixtureRaidWebhookMessage,
  HANG_THRESHOLD_MS,
  sleep,
  timedFetch,
  WORLD_VIEWPORT,
  WS_QUIET_WINDOW_MS,
  WS_WAIT_MS,
  waitForServerReady,
} from './support/harness'

const REPO_ROOT = path.join(__dirname, '..', '..')

// Distinct from auth-flow.acceptance.js's 18234, so the two suites can run
// concurrently without colliding.
const TEST_PORT = 18236
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`
const WS_URL = `ws://127.0.0.1:${TEST_PORT}/api/ws`

const RUN_ID = crypto.randomBytes(4).toString('hex')
const USER_PREFIX = `transport-${RUN_ID}`
const { signUpAndSignIn } = createAuthHelpers({
  baseUrl: BASE_URL,
  prefix: USER_PREFIX,
})

let serverProcess: import('bun').Subprocess | null = null
let db: import('mysql2/promise').Connection | null = null
let fakeGolbat: ReturnType<typeof startFakeGolbat> | null = null

/** The shared socket client, bound to this suite's server. */
class TransportSocketClient extends AcceptanceSocketClient {
  constructor(cookie: string | null) {
    super(WS_URL, cookie)
  }
}

const TRPC_URL = `${BASE_URL}/api/trpc`

/**
 * Calls one `rules.*` procedure over real HTTP with a real session cookie.
 * tRPC decides a procedure's kind by method: GET is a query, POST a
 * mutation.
 */
async function rulesRpc(
  cookie: string | null,
  procedure: 'rules.list' | 'rules.create' | 'rules.delete',
  input?: unknown,
): Promise<any> {
  // `rules.list` takes no input, so a query needs no `?input=` here.
  const isQuery = procedure === 'rules.list'
  const { response, json, text } = await timedFetch(
    `${TRPC_URL}/${procedure}`,
    {
      method: isQuery ? 'GET' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        // A missing cookie is a 401 from the procedure, which is the loud
        // failure an arrange step wants rather than a silent anonymous call.
        ...(cookie ? { Cookie: cookie } : {}),
      },
      ...(isQuery ? {} : { body: JSON.stringify(input ?? {}) }),
    },
  )
  const errorMessage = json?.error?.message ?? json?.error?.json?.message
  if (!response.ok || errorMessage) {
    throw new Error(
      `${procedure} failed (HTTP ${response.status}): ${errorMessage ?? text}`,
    )
  }
  return json?.result?.data
}

/**
 * Narrows an account to exactly one species, and answers the id of the rule
 * that does it.
 *
 * The seeded Everything rule (auth/seed-profile.ts) is what makes a first
 * login show a populated map, and it matches every pokemon there is -- so a
 * criterion asserting that a NON-matching pokemon is withheld has to delete
 * it first, or everything in the world matches something.
 */
async function showOnlySpecies(
  cookie: string | null,
  speciesId: number,
): Promise<number> {
  const existing = await rulesRpc(cookie, 'rules.list')
  if (existing.length) {
    await rulesRpc(cookie, 'rules.delete', {
      ruleIds: existing.map((rule: any) => rule.id),
    })
  }
  const { ids } = await rulesRpc(cookie, 'rules.create', {
    name: `Species ${speciesId}`,
    speciesIds: [speciesId],
  })
  return ids[0]
}

beforeAll(async () => {
  db = await mysql.createConnection({
    host: process.env.REACT_MAP_DB_HOST!,
    port: Number(process.env.REACT_MAP_DB_PORT),
    user: process.env.REACT_MAP_DB_USERNAME!,
    password: process.env.REACT_MAP_DB_PASSWORD!,
    database: process.env.REACT_MAP_DB_NAME!,
  })

  fakeGolbat = startFakeGolbat()

  serverProcess = Bun.spawn({
    cmd: ['bun', 'server/src/serve.ts'],
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

  await waitForServerReady(BASE_URL, 45_000)
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
    // Signing in seeds a profile and a rule per account (auth/seed-profile.ts),
    // and two criteria write rules of their own. None of it carries a foreign
    // key to auth_user, so it outlives the run unless removed by hand; the
    // children are keyed by rule id, so they go first.
    const userScope = `SELECT id FROM auth_user WHERE email LIKE ?`
    const ruleScope = `SELECT id FROM rule WHERE user_id IN (${userScope})`
    await db.query(
      `DELETE FROM rule_exclusion WHERE rule_id IN (${ruleScope})`,
      [`${USER_PREFIX}-%`],
    )
    await db.query(`DELETE FROM rule_pokemon WHERE rule_id IN (${ruleScope})`, [
      `${USER_PREFIX}-%`,
    ])
    await db.query(`DELETE FROM rule WHERE user_id IN (${userScope})`, [
      `${USER_PREFIX}-%`,
    ])
    await db.query(`DELETE FROM profile WHERE user_id IN (${userScope})`, [
      `${USER_PREFIX}-%`,
    ])
    await db.query(
      `DELETE FROM auth_session WHERE user_id IN (SELECT id FROM auth_user WHERE email LIKE ?)`,
      [`${USER_PREFIX}-%`],
    )
    await db.query(
      `DELETE FROM auth_account WHERE user_id IN (SELECT id FROM auth_user WHERE email LIKE ?)`,
      [`${USER_PREFIX}-%`],
    )
    await db.query(
      `DELETE FROM user_perms WHERE user_id IN (SELECT id FROM auth_user WHERE email LIKE ?)`,
      [`${USER_PREFIX}-%`],
    )
    await db.query(`DELETE FROM auth_user WHERE email LIKE ?`, [
      `${USER_PREFIX}-%`,
    ])
    await db.end()
  }
}, 30_000)

// ---------------------------------------------------------------------------
// Criterion 1: a signed-in client subscribing to a viewport receives an
// initial set of Pokemon matching its rules.
// ---------------------------------------------------------------------------
describe('criterion 1: initial subscribe yields only matching pokemon', () => {
  test(
    'a client subscribing with a species filter receives the matching pokemon and not the non-matching one',
    async () => {
      fakeGolbat!.setPokemonHandler(() => ({
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
      // The narrowing lives in the account's rules now, not in the message.
      const ruleId = await showOnlySpecies(cookie, 1)
      const client = new TransportSocketClient(cookie)
      await client.waitForOpen()

      const start = performance.now()
      client.send({
        type: 'subscribe',
        category: 'pokemon',
        viewport: WORLD_VIEWPORT,
      })

      const delta = await client.waitForSince(
        0,
        (msg) =>
          msg?.type === 'delta' &&
          msg?.category === 'pokemon' &&
          Array.isArray(msg.added) &&
          msg.added.some((p: any) => p.pokemon_id === 1),
        WS_WAIT_MS,
        'criterion 1: initial delta containing the matching pokemon',
      )
      expect(performance.now() - start).toBeLessThan(WS_WAIT_MS)
      expect(delta.added.some((p: any) => p.pokemon_id === 99)).toBe(false)
      // And the entity says which rule put it there.
      expect(delta.added[0].matched).toEqual([ruleId])

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
      fakeGolbat!.setPokemonHandler((body) => {
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
      const client = new TransportSocketClient(cookie)
      await client.waitForOpen()

      client.send({
        type: 'subscribe',
        category: 'pokemon',
        viewport: REGION_A,
      })
      await client.waitForSince(
        0,
        (msg) =>
          msg?.type === 'delta' &&
          msg?.category === 'pokemon' &&
          (msg.added || []).some((p: any) => p.id === 'c2-region-a'),
        WS_WAIT_MS,
        'criterion 2: initial delta from region A',
      )

      const mark = client.mark()
      client.send({
        type: 'subscribe',
        category: 'pokemon',
        viewport: REGION_B,
      })

      await client.waitForSince(
        mark,
        (msg) =>
          msg?.type === 'delta' &&
          msg?.category === 'pokemon' &&
          (msg.added || []).some((p: any) => p.id === 'c2-region-b'),
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
      let pokemonInWorld: any[] = []
      fakeGolbat!.setPokemonHandler(() => ({
        pokemon: pokemonInWorld,
        examined: pokemonInWorld.length,
        skipped: 0,
        total: pokemonInWorld.length,
        limit_reached: false,
      }))

      const cookie = await signUpAndSignIn('c3')
      const client = new TransportSocketClient(cookie)
      await client.waitForOpen()

      client.send({
        type: 'subscribe',
        category: 'pokemon',
        viewport: WORLD_VIEWPORT,
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
          (msg.added || []).some((p: any) => p.id === 'c3-new'),
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

      fakeGolbat!.setPokemonHandler(() => {
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
      const client = new TransportSocketClient(cookie)
      await client.waitForOpen()

      client.send({
        type: 'subscribe',
        category: 'pokemon',
        viewport: WORLD_VIEWPORT,
      })
      await client.waitForSince(
        0,
        (msg) =>
          msg?.type === 'delta' &&
          msg?.category === 'pokemon' &&
          (msg.added || []).some((p: any) => p.id === 'c4-verified') &&
          (msg.added || []).some((p: any) => p.id === 'c4-unverified'),
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
      fakeGolbat!.setFortHandler(() => ({
        gyms: [],
        pokestops: [],
        stations: [],
        examined: 0,
        skipped: 0,
        total: 0,
        limit_reached: false,
      }))

      const cookie = await signUpAndSignIn('c5')
      const client = new TransportSocketClient(cookie)
      await client.waitForOpen()

      client.send({
        type: 'subscribe',
        category: 'gym',
        viewport: WORLD_VIEWPORT,
      })
      const mark = client.mark()

      fakeGolbat!.resetRequestLog()
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
            .some((g: any) => g.id === GYM_ID),
        WS_WAIT_MS,
        'criterion 5: gym delta reflecting the webhook-delivered raid change',
      )
      const gym = delta.added
        .concat(delta.changed || [])
        .find((g: any) => g.id === GYM_ID)
      expect(gym.raid_level).toBe(5)
      expect(gym.raid_pokemon_id).toBe(150)

      const fortScanCallsSinceWebhook = fakeGolbat!
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
      fakeGolbat!.setPokemonHandler(() => {
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
      const client = new TransportSocketClient(cookie)
      await client.waitForOpen()

      client.send({
        type: 'subscribe',
        category: 'pokemon',
        viewport: WORLD_VIEWPORT,
      })
      await client.waitForSince(
        0,
        (msg) =>
          msg?.type === 'delta' &&
          msg?.category === 'pokemon' &&
          (msg.added || []).some((p: any) => p.id === 'c6-live'),
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
      fakeGolbat!.setPokemonHandler(() => ({
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
      // Two accounts wanting different things: what separates them is their
      // own rules, which is the whole point of the criterion.
      await showOnlySpecies(cookieA, 1)
      await showOnlySpecies(cookieB, 4)
      const clientA = new TransportSocketClient(cookieA)
      const clientB = new TransportSocketClient(cookieB)
      await Promise.all([clientA.waitForOpen(), clientB.waitForOpen()])

      clientA.send({
        type: 'subscribe',
        category: 'pokemon',
        viewport: WORLD_VIEWPORT,
      })
      clientB.send({
        type: 'subscribe',
        category: 'pokemon',
        viewport: WORLD_VIEWPORT,
      })

      const deltaA = await clientA.waitForSince(
        0,
        (msg) =>
          msg?.type === 'delta' &&
          msg?.category === 'pokemon' &&
          (msg.added || []).some((p: any) => p.id === 'c7-species-1'),
        WS_WAIT_MS,
        'criterion 7: client A delta with species 1',
      )
      const deltaB = await clientB.waitForSince(
        0,
        (msg) =>
          msg?.type === 'delta' &&
          msg?.category === 'pokemon' &&
          (msg.added || []).some((p: any) => p.id === 'c7-species-4'),
        WS_WAIT_MS,
        'criterion 7: client B delta with species 4',
      )

      expect(deltaA.added.some((p: any) => p.id === 'c7-species-4')).toBe(false)
      expect(deltaB.added.some((p: any) => p.id === 'c7-species-1')).toBe(false)

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
      const client = new TransportSocketClient(cookie)
      const elapsedMs = await client.waitForOpen(CLIENT_TIMEOUT_MS)
      expect(elapsedMs).toBeLessThan(HANG_THRESHOLD_MS)
      await client.closeAndWait()
    },
    CLIENT_TIMEOUT_MS * 2,
  )

  test(
    'a subscribe request gets an answer within the client timeout, not silence',
    async () => {
      fakeGolbat!.setPokemonHandler(() => ({
        pokemon: [],
        examined: 0,
        skipped: 0,
        total: 0,
        limit_reached: false,
      }))
      const cookie = await signUpAndSignIn('c8answer')
      const client = new TransportSocketClient(cookie)
      await client.waitForOpen()

      const start = performance.now()
      client.send({
        type: 'subscribe',
        category: 'pokemon',
        viewport: WORLD_VIEWPORT,
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
      const client = new TransportSocketClient(cookie)
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

  // The webhook receiver's own size check reads `content-length`, and a
  // chunked request does not send one. `Number(null)` is `0`, so that check
  // waves an arbitrarily large body straight through -- it stops an honest
  // sender and nobody else. The real ceiling is `maxRequestBodySize` on
  // `Bun.serve`, which the transport applies before any handler runs, and
  // only a live server over a real socket can show that it holds. Both
  // framings are sent here because the bug was that they disagreed.
  test('an oversized body is refused however it is framed, not just when it declares its length', async () => {
    const oversized = JSON.stringify([
      {
        type: 'raid',
        message: { gym_id: 'x'.repeat(17 * 1024 * 1024), level: 5 },
      },
    ])

    const declared = await fetch(`${BASE_URL}/api/webhooks/golbat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: oversized,
    })
    expect(declared.status).toBe(413)

    // A stream body makes the client send `Transfer-Encoding: chunked` with
    // no `content-length`, which is what defeated the handler-level check.
    const chunked = await fetch(`${BASE_URL}/api/webhooks/golbat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(oversized))
          controller.close()
        },
      }),
      // @ts-expect-error -- `duplex` is required for a stream body and is
      // not yet in the lib.dom RequestInit type.
      duplex: 'half',
    })
    expect(chunked.status).toBe(413)
  })
})
