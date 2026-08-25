// The WS bridge's own bookkeeping: what the connection remembers about a
// subscription whose poll loop has ended. The wire contract itself is
// covered end to end by `server/acceptance/transport.acceptance.ts`; this
// file drives the `websocket` callbacks directly with a fake socket.

import { expect, test } from 'bun:test'
import { createSocketServer } from '../src/ws/socket-server'

const VIEWPORT = { min: { lat: 0, lon: 0 }, max: { lat: 1, lon: 1 } }

/** Enough of Bun's per-socket object for `websocket.message` to run. */
function fakeWs() {
  const sent: any[] = []
  return {
    sent,
    data: {
      id: 'connection-1',
      cookie: '',
      userId: null,
      subscriptions: new Map(),
      revocationTimer: null,
    },
    send(raw: string) {
      sent.push(JSON.parse(raw))
    },
    close() {},
  }
}

function subscribe(server: any, ws: any, category: 'pokemon' | 'gym') {
  server.websocket.message(
    ws,
    JSON.stringify({ type: 'subscribe', category, viewport: VIEWPORT }),
  )
}

/** Lets the subscription loop run to its first await and back. */
async function settle() {
  for (let i = 0; i < 10; i += 1) await Promise.resolve()
  await new Promise((resolve) => setTimeout(resolve, 5))
}

test('a pokemon subscription whose poll throws can be subscribed again', async () => {
  let failing = true
  const server = createSocketServer({
    golbatClient: {
      scanPokemon: async () => {
        if (failing) throw new Error('Golbat apiUrl is not configured')
        return { pokemon: [], limitReached: false }
      },
      scanForts: async () => ({
        gyms: [],
        pokestops: [],
        stations: [],
        limitReached: false,
      }),
    },
  })
  const ws = fakeWs()

  subscribe(server, ws, 'pokemon')
  await settle()

  // The loop is over -- a pokemon poll has no push path to fall back on,
  // so `subscribeCategory` lets the error out rather than looping on a
  // refusal. What must NOT survive it is the connection's record of the
  // subscription: with the entry still there, every later subscribe would
  // update a state nothing is reading.
  expect(ws.sent).toHaveLength(0)
  expect(ws.data.subscriptions.has('pokemon')).toBe(false)

  // So the client's next viewport change starts a fresh loop, and once
  // Golbat is reachable again it delivers.
  failing = false
  subscribe(server, ws, 'pokemon')
  await settle()
  expect(ws.data.subscriptions.has('pokemon')).toBe(true)
  expect(ws.sent.map((msg) => msg.category)).toContain('pokemon')

  server.websocket.close(ws)
})

test('a healthy subscription keeps its entry and updates in place', async () => {
  const server = createSocketServer({
    golbatClient: {
      scanPokemon: async () => ({ pokemon: [], limitReached: false }),
      scanForts: async () => ({
        gyms: [],
        pokestops: [],
        stations: [],
        limitReached: false,
      }),
    },
  })
  const ws = fakeWs()

  subscribe(server, ws, 'pokemon')
  await settle()
  const entry = ws.data.subscriptions.get('pokemon')
  expect(entry).toBeDefined()

  subscribe(server, ws, 'pokemon')
  await settle()
  expect(ws.data.subscriptions.get('pokemon')).toBe(entry)

  server.websocket.close(ws)
})

test('subscribe no longer accepts client-sent filters', async () => {
  // The server resolves rules from the session. A `filters` field on the
  // message is ignored rather than trusted -- otherwise any client could
  // ask Golbat for whatever it liked, whatever its own rules say.
  const server = createSocketServer({
    golbatClient: {
      scanPokemon: async () => ({ pokemon: [], limitReached: false }),
      scanForts: async () => ({
        gyms: [],
        pokestops: [],
        stations: [],
        limitReached: false,
      }),
    },
  })
  const ws = fakeWs()

  server.websocket.message(
    ws,
    JSON.stringify({
      type: 'subscribe',
      category: 'pokemon',
      viewport: VIEWPORT,
      filters: [{ pokemon: [{ id: 1 }] }],
    }),
  )
  await settle()

  expect(ws.data.subscriptions.get('pokemon').state.filters).toEqual([])

  server.websocket.close(ws)
})
