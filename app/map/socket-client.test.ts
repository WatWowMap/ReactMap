import { beforeEach, expect, test } from 'bun:test'
import { useEntityStore } from './entity-store'
import { createMapSocket, type SocketLike } from './socket-client'
import type { DeltaMessage } from './wire'

class FakeSocket implements SocketLike {
  sent: string[] = []
  closed = false
  onopen: (() => void) | null = null
  onmessage: ((event: { data: unknown }) => void) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null

  send(data: string) {
    this.sent.push(data)
  }

  close() {
    this.closed = true
  }

  open() {
    this.onopen?.()
  }

  deliver(message: unknown) {
    this.onmessage?.({ data: JSON.stringify(message) })
  }

  drop() {
    this.onclose?.()
  }

  subscribes() {
    return this.sent.map((raw) => JSON.parse(raw))
  }
}

const BOUNDS = { west: -1, south: 51, east: 1, north: 52 }
const NARROW = { west: -0.5, south: 51.2, east: 0.5, north: 51.8 }

function harness(onDelta?: (delta: DeltaMessage) => void) {
  const sockets: FakeSocket[] = []
  const deltas: DeltaMessage[] = []
  const client = createMapSocket({
    url: 'ws://test.invalid/api/ws',
    onDelta: (delta) => {
      deltas.push(delta)
      onDelta?.(delta)
    },
    reconnectDelayMs: 0,
    connect: () => {
      const socket = new FakeSocket()
      sockets.push(socket)
      return socket
    },
  })
  function latest(): FakeSocket {
    const socket = sockets[sockets.length - 1]
    if (!socket) throw new Error('no socket has been created yet')
    return socket
  }
  return { sockets, deltas, client, latest }
}

/** Lets the reconnect timer (delay 0) fire. */
function tick() {
  return new Promise((resolve) => setTimeout(resolve, 1))
}

function pokemonDelta(id: string): DeltaMessage {
  return {
    type: 'delta',
    category: 'pokemon',
    added: [
      {
        id,
        lat: 51.5,
        lon: -0.1,
        pokemon_id: 25,
        expire_timestamp: 1_700_000_000,
        expire_timestamp_verified: false,
      },
    ],
    changed: [],
    removed: [],
  }
}

beforeEach(() => {
  useEntityStore.getState().clear()
})

test('subscribes both categories once the socket opens', () => {
  const { client, latest } = harness()
  client.setViewport(BOUNDS)
  expect(latest().sent).toHaveLength(0)

  latest().open()
  const messages = latest().subscribes()
  expect(messages.map((m) => m.category).sort()).toEqual(['gym', 'pokemon'])
  expect(messages[0]).toEqual({
    type: 'subscribe',
    category: 'pokemon',
    viewport: { min: { lat: 51, lon: -1 }, max: { lat: 52, lon: 1 } },
    filters: [],
  })
  client.close()
})

test('a viewport change resubscribes in place on the open socket', () => {
  const { client, sockets, latest } = harness()
  client.setViewport(BOUNDS)
  latest().open()
  client.setViewport(NARROW)

  expect(sockets).toHaveLength(1)
  const messages = latest().subscribes()
  expect(messages).toHaveLength(4)
  expect(messages[2]?.viewport).toEqual({
    min: { lat: 51.2, lon: -0.5 },
    max: { lat: 51.8, lon: 0.5 },
  })
  client.close()
})

test('delta frames reach the handler and anything else does not', () => {
  const { client, latest, deltas } = harness()
  client.setViewport(BOUNDS)
  latest().open()

  latest().deliver(pokemonDelta('a'))
  latest().deliver({ type: 'something-else' })
  latest().onmessage?.({ data: 'not json at all' })

  expect(deltas).toHaveLength(1)
  expect(deltas[0]?.category).toBe('pokemon')
  client.close()
})

test('a dropped socket reconnects and resubscribes with the current viewport', async () => {
  const { client, sockets, latest } = harness()
  client.setViewport(BOUNDS)
  latest().open()
  client.setViewport(NARROW)
  latest().drop()

  await tick()
  expect(sockets).toHaveLength(2)
  latest().open()
  expect(latest().subscribes()[0]?.viewport).toEqual({
    min: { lat: 51.2, lon: -0.5 },
    max: { lat: 51.8, lon: 0.5 },
  })
  client.close()
})

test('a reconnect keeps what the map already holds and does not duplicate it', async () => {
  const { client, latest } = harness(useEntityStore.getState().applyDelta)
  client.setViewport(BOUNDS)
  latest().open()
  latest().deliver(pokemonDelta('encounter-1'))
  expect(useEntityStore.getState().pokemon).toHaveLength(1)

  latest().drop()
  await tick()
  // The server starts a fresh diff after a reconnect, so everything in
  // the viewport arrives as `added` again.
  latest().deliver(pokemonDelta('encounter-1'))
  expect(useEntityStore.getState().pokemon).toHaveLength(1)

  client.close()
})

test('closing deliberately does not reconnect', async () => {
  const { client, sockets, latest } = harness()
  client.setViewport(BOUNDS)
  latest().open()
  client.close()
  latest().drop()

  await tick()
  expect(sockets).toHaveLength(1)
  expect(sockets[0]?.closed).toBe(true)
})

test('a handshake that never completes is abandoned and retried', async () => {
  const sockets: FakeSocket[] = []
  const client = createMapSocket({
    url: 'ws://test.invalid/api/ws',
    onDelta: () => undefined,
    reconnectDelayMs: 0,
    connectTimeoutMs: 1,
    connect: () => {
      const socket = new FakeSocket()
      sockets.push(socket)
      return socket
    },
  })
  client.setViewport(BOUNDS)

  // Nothing opens, and nothing closes either -- a proxy that answers the
  // upgrade as ordinary HTTP leaves the socket in CONNECTING with no
  // event at all, so `onclose` cannot be what recovers from it.
  await tick()
  await tick()
  expect(sockets[0]?.closed).toBe(true)
  expect(sockets.length).toBeGreaterThan(1)

  // The retry is an ordinary connection: it opens and subscribes.
  const live = sockets[sockets.length - 1]
  live?.open()
  expect(live?.subscribes().map((msg) => msg.category)).toEqual([
    'pokemon',
    'gym',
  ])
  client.close()
})

test('a socket that opens in time is left alone', async () => {
  const sockets: FakeSocket[] = []
  const client = createMapSocket({
    url: 'ws://test.invalid/api/ws',
    onDelta: () => undefined,
    reconnectDelayMs: 0,
    connectTimeoutMs: 1,
    connect: () => {
      const socket = new FakeSocket()
      sockets.push(socket)
      return socket
    },
  })
  client.setViewport(BOUNDS)
  sockets[0]?.open()

  await tick()
  await tick()
  expect(sockets).toHaveLength(1)
  expect(sockets[0]?.closed).toBe(false)
  client.close()
})
