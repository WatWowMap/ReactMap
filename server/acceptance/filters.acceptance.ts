// server/acceptance/filters.acceptance.ts
//
// The eight acceptance criteria for the Filters plan, written before any of
// the plan's other tasks change production code. Every one of them is
// expected to be RED right now, and each later task in the plan is judged by
// which of these lines turn green. Nothing here may be weakened to make that
// easier.
//
// The rules this file follows are the transport suite's rules, because it
// runs on the transport suite's harness (support/harness.ts) against a real
// server process:
//   - Every assertion is made against a real HTTP response or a real
//     WebSocket message. Nothing here imports a server module to check what
//     it returns.
//   - Every wait carries an explicit timeout, so a message that never
//     arrives fails loudly as a hang rather than passing silently.
//   - The database is only ever used to clean up what this run created. It
//     is never the assertion itself.
//
// Why each criterion is red today: there are no `rules.*` procedures on the
// tRPC router (server/src/trpc/router.ts has `health` and `map.subscribe`
// and nothing else) and no table behind them, so every call below fails on a
// missing procedure. That IS red, and it is the right kind of red -- a
// failure in the harness would prove nothing about the feature.

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
  timedFetch,
  WORLD_VIEWPORT,
  WS_WAIT_MS,
  waitForServerReady,
} from './support/harness'

const REPO_ROOT = path.join(__dirname, '..', '..')

// Distinct from auth-flow's 18234 and transport's 18236, so all three suites
// can run at once without colliding.
const TEST_PORT = 18237
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`
const WS_URL = `ws://127.0.0.1:${TEST_PORT}/api/ws`
const TRPC_URL = `${BASE_URL}/api/trpc`

const RUN_ID = crypto.randomBytes(4).toString('hex')
const USER_PREFIX = `filters-${RUN_ID}`
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

// tRPC decides a procedure's kind by HTTP method: GET is a query, POST is a
// mutation. Listing the queries explicitly is duller than inferring it from
// whether an input was passed, and it does not quietly break the first time a
// query takes an argument.
const QUERY_PROCEDURES = new Set(['rules.list'])

/**
 * Calls one tRPC procedure over real HTTP with a real session cookie, and
 * returns its unwrapped data. Throws on a transport error, an HTTP error or a
 * tRPC error body, so a criterion can assert on a rejection.
 */
async function rpc(
  cookie: string | null,
  procedure: string,
  input?: unknown,
): Promise<any> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (cookie) headers.Cookie = cookie

  const isQuery = QUERY_PROCEDURES.has(procedure)
  const url = isQuery
    ? `${TRPC_URL}/${procedure}${
        input === undefined
          ? ''
          : `?input=${encodeURIComponent(JSON.stringify(input))}`
      }`
    : `${TRPC_URL}/${procedure}`

  const { response, json, text } = await timedFetch(url, {
    method: isQuery ? 'GET' : 'POST',
    headers,
    ...(isQuery ? {} : { body: JSON.stringify(input ?? {}) }),
  })

  const errorMessage =
    json?.error?.message ??
    json?.error?.json?.message ??
    json?.[0]?.error?.message

  if (!response.ok || errorMessage) {
    throw new Error(
      `${procedure} failed (HTTP ${response.status}): ${errorMessage ?? text}`,
    )
  }
  return json?.result?.data
}

// Twenty-five species, the kind of set a "rare spawns" card holds. Larvitar
// (246) is in here because criterion 4 splits the group on it, and Dratini
// (147) because criteria 5 and 6 spawn one.
const SPECIES_25 = [
  113, 114, 131, 143, 147, 148, 149, 179, 185, 201, 208, 212, 214, 215, 216,
  225, 227, 236, 237, 238, 239, 240, 241, 246, 248,
]

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
    // The rule tables carry no foreign key to auth_user, so nothing cascades
    // and these rows outlive the run unless they are removed by hand. Order
    // matters anyway: the children are keyed by rule id, so they go first.
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
// Criterion 1: a brand new account can already see the map.
// ---------------------------------------------------------------------------
describe('criterion 1: a first login is usable without configuring anything', () => {
  test(
    'a first login seeds a profile and an Everything rule, and the map shows pokemon',
    async () => {
      const cookie = await signUpAndSignIn('f1')
      const rules = await rpc(cookie, 'rules.list')
      expect(rules.map((r: any) => r.name)).toEqual(['Everything'])

      fakeGolbat!.setPokemonHandler(() => ({
        pokemon: [fixturePokemon({ id: 'f1-a', pokemonId: 25 })],
        examined: 1,
        skipped: 0,
        total: 1,
        limit_reached: false,
      }))
      const client = new TransportSocketClient(cookie)
      await client.waitForOpen()
      client.send({
        type: 'subscribe',
        category: 'pokemon',
        viewport: WORLD_VIEWPORT,
      })
      const delta = await client.waitFor(
        (m) => m?.type === 'delta' && (m.added || []).length > 0,
        WS_WAIT_MS,
        'criterion 1: seeded rule produces entities',
      )
      expect(delta.added[0].id).toBe('f1-a')
      await client.closeAndWait()
    },
    WS_WAIT_MS + CLIENT_TIMEOUT_MS,
  )
})

// ---------------------------------------------------------------------------
// Criterion 2: with no rules, the map is empty -- filtering is subtractive
// from nothing, not from everything.
// ---------------------------------------------------------------------------
describe('criterion 2: no rules means no entities', () => {
  test(
    'deleting the only rule empties the map',
    async () => {
      const cookie = await signUpAndSignIn('f2')
      const [seeded] = await rpc(cookie, 'rules.list')
      fakeGolbat!.setPokemonHandler(() => ({
        pokemon: [fixturePokemon({ id: 'f2-a', pokemonId: 25 })],
        examined: 1,
        skipped: 0,
        total: 1,
        limit_reached: false,
      }))
      await rpc(cookie, 'rules.delete', { ruleIds: [seeded.id] })

      const client = new TransportSocketClient(cookie)
      await client.waitForOpen()
      client.send({
        type: 'subscribe',
        category: 'pokemon',
        viewport: WORLD_VIEWPORT,
      })
      const delta = await client.waitFor(
        (m) => m?.type === 'delta',
        WS_WAIT_MS,
        'criterion 2: no rules means no entities',
      )
      // Golbat still has the pokemon. Nothing matches it, so nothing is sent.
      expect(delta.added).toEqual([])
      await client.closeAndWait()
    },
    WS_WAIT_MS + CLIENT_TIMEOUT_MS,
  )
})

// ---------------------------------------------------------------------------
// Criterion 3: a multi-species selection is many rows, and the UI groups
// them back into one card. The row is the unit of storage, not the card.
// ---------------------------------------------------------------------------
describe('criterion 3: one row per species, one card per identical set', () => {
  test('selecting 25 species writes 25 rows and renders one group', async () => {
    const cookie = await signUpAndSignIn('f3')
    await rpc(cookie, 'rules.create', {
      name: 'Rare spawns',
      size: 'lg',
      speciesIds: SPECIES_25,
    })
    const rules = await rpc(cookie, 'rules.list')
    const rare = rules.filter((r: any) => r.name === 'Rare spawns')
    expect(rare).toHaveLength(25)
    // Identical in every column except species, so one card.
    expect(new Set(rare.map((r: any) => r.size))).toEqual(new Set(['lg']))
  })
})

// ---------------------------------------------------------------------------
// Criterion 4: editing one species out of a group splits the group without
// disturbing the other twenty-four rows.
// ---------------------------------------------------------------------------
describe('criterion 4: a group splits on the row that changed', () => {
  test('changing one species size splits the group in two', async () => {
    const cookie = await signUpAndSignIn('f4')
    await rpc(cookie, 'rules.create', {
      name: 'Rare spawns',
      size: 'lg',
      speciesIds: SPECIES_25,
    })
    const before = (await rpc(cookie, 'rules.list')).filter(
      (r: any) => r.name === 'Rare spawns',
    )
    const larvitar = before.find((r: any) => r.speciesId === 246)

    await rpc(cookie, 'rules.update', {
      ruleIds: [larvitar.id],
      patch: { size: 'xl' },
    })

    const after = (await rpc(cookie, 'rules.list')).filter(
      (r: any) => r.name === 'Rare spawns',
    )
    expect(after).toHaveLength(25) // still 25 rows
    expect(after.filter((r: any) => r.size === 'lg')).toHaveLength(24)
    expect(after.filter((r: any) => r.size === 'xl')).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// Criterion 5: overlapping rules do not race. The wire carries every rule an
// entity matched, and the client decides which one wins.
// ---------------------------------------------------------------------------
describe('criterion 5: an entity carries every rule it matched', () => {
  test(
    'a pokemon matching two rules carries both rule ids',
    async () => {
      const cookie = await signUpAndSignIn('f5')
      // The seeded Everything rule matches every pokemon there is
      // (criterion 1), so leaving it in place would make it a third rule
      // this entity genuinely matched -- true, and not what this criterion
      // is measuring. Removing it makes the rules below the whole rule set.
      // The assertion itself is untouched.
      const [seeded] = await rpc(cookie, 'rules.list')
      await rpc(cookie, 'rules.delete', { ruleIds: [seeded.id] })
      const hundos = await rpc(cookie, 'rules.create', {
        name: 'Hundos',
        size: 'xl',
        glow: '#ffc83d',
        ivMin: 100,
        speciesIds: [null],
      })
      const rare = await rpc(cookie, 'rules.create', {
        name: 'Rare spawns',
        size: 'lg',
        speciesIds: [147],
      })

      fakeGolbat!.setPokemonHandler(() => ({
        pokemon: [fixturePokemon({ id: 'f5-a', pokemonId: 147, iv: 100 })],
        examined: 1,
        skipped: 0,
        total: 1,
        limit_reached: false,
      }))
      const client = new TransportSocketClient(cookie)
      await client.waitForOpen()
      client.send({
        type: 'subscribe',
        category: 'pokemon',
        viewport: WORLD_VIEWPORT,
      })
      const delta = await client.waitFor(
        (m) => (m?.added || []).length > 0,
        WS_WAIT_MS,
        'criterion 5: both rules matched',
      )
      const entity = delta.added.find((e: any) => e.id === 'f5-a')
      // Resolution happens on the client; the wire's job is to carry both ids.
      expect(entity.matched.sort()).toEqual([hundos.ids[0], rare.ids[0]].sort())
      await client.closeAndWait()
    },
    WS_WAIT_MS + CLIENT_TIMEOUT_MS,
  )
})

// ---------------------------------------------------------------------------
// Criterion 6: the same delta, read the way the popup reads it. An id is
// only useful if it names something the user recognises.
// ---------------------------------------------------------------------------
describe('criterion 6: matched ids name the rules a popup shows', () => {
  test(
    'the matched ids resolve to the names a popup would show',
    async () => {
      const cookie = await signUpAndSignIn('f6')
      // The seeded Everything rule matches every pokemon there is
      // (criterion 1), so leaving it in place would make it a third rule
      // this entity genuinely matched -- true, and not what this criterion
      // is measuring. Removing it makes the rules below the whole rule set.
      // The assertion itself is untouched.
      const [seeded] = await rpc(cookie, 'rules.list')
      await rpc(cookie, 'rules.delete', { ruleIds: [seeded.id] })
      await rpc(cookie, 'rules.create', {
        name: 'Hundos',
        ivMin: 100,
        speciesIds: [null],
      })
      fakeGolbat!.setPokemonHandler(() => ({
        pokemon: [fixturePokemon({ id: 'f6-a', pokemonId: 147, iv: 100 })],
        examined: 1,
        skipped: 0,
        total: 1,
        limit_reached: false,
      }))
      const client = new TransportSocketClient(cookie)
      await client.waitForOpen()
      client.send({
        type: 'subscribe',
        category: 'pokemon',
        viewport: WORLD_VIEWPORT,
      })
      const delta = await client.waitFor(
        (m) => (m?.added || []).length > 0,
        WS_WAIT_MS,
        'criterion 6: ids name rules',
      )
      const rules = await rpc(cookie, 'rules.list')
      const byId = new Map<number, any>(rules.map((r: any) => [r.id, r]))
      const names = delta.added[0].matched.map(
        (id: number) => byId.get(id)?.name,
      )
      expect(names).toEqual(['Hundos'])
      await client.closeAndWait()
    },
    WS_WAIT_MS + CLIENT_TIMEOUT_MS,
  )
})

// ---------------------------------------------------------------------------
// Criterion 7: two real connections, not a mocked version bump. A rule
// changed on one device reaches a map already open on another.
// ---------------------------------------------------------------------------
describe('criterion 7: an open map notices a rule edited elsewhere', () => {
  test(
    'a rule edited in another session reaches an open map without a reload',
    async () => {
      const cookie = await signUpAndSignIn('f7')
      const watcher = new TransportSocketClient(cookie)
      await watcher.waitForOpen()
      watcher.send({
        type: 'subscribe',
        category: 'pokemon',
        viewport: WORLD_VIEWPORT,
      })
      const first = await watcher.waitFor(
        (m) => m?.type === 'delta',
        WS_WAIT_MS,
        'criterion 7: baseline',
      )
      const baseline = first.rulesVersion

      // A different session, same account, as a second device would be.
      await rpc(cookie, 'rules.create', {
        name: 'Added elsewhere',
        ivMin: 90,
        speciesIds: [null],
      })

      const later = await watcher.waitFor(
        (m) => m?.type === 'delta' && m.rulesVersion !== baseline,
        WS_WAIT_MS,
        'criterion 7: the open map notices the edit',
      )
      expect(later.rulesVersion).toBeGreaterThan(baseline)
      await watcher.closeAndWait()
    },
    2 * WS_WAIT_MS + CLIENT_TIMEOUT_MS,
  )
})

// ---------------------------------------------------------------------------
// Criterion 8: an exclusion only means something on a rule that did not name
// its species. The server is where that holds, not the UI.
// ---------------------------------------------------------------------------
describe('criterion 8: exclusions belong only to any-species rules', () => {
  test('a rule naming a species cannot carry exclusions', async () => {
    const cookie = await signUpAndSignIn('f8')
    // The UI hides the control; the server refuses it regardless, because a
    // rule naming one species has nothing to carve out of.
    await expect(
      rpc(cookie, 'rules.create', {
        name: 'Bad',
        speciesIds: [147],
        exclusions: [129],
      }),
    ).rejects.toThrow(/exclusion/i)

    // The same exclusion on an any-species rule is accepted.
    const ok = await rpc(cookie, 'rules.create', {
      name: 'Good',
      speciesIds: [null],
      exclusions: [129],
    })
    expect(ok.ids).toHaveLength(1)
  })
})
