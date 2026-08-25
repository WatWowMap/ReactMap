import { afterAll, afterEach, beforeAll, expect, test } from 'bun:test'
import { cleanup, render } from '@testing-library/react'
import { setupDom, teardownDom } from '../test-setup'
import { useEntityStore } from './entity-store'
import type { SocketLike } from './socket-client'
import type { Bounds } from './types'
import { useMapSocket } from './use-map-socket'

beforeAll(setupDom)
afterAll(teardownDom)
afterEach(cleanup)

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
}

const BOUNDS: Bounds = { west: -1, south: 51, east: 1, north: 52 }

// The hook waits for the camera to settle before subscribing. Tests that
// are not about that wait pass 0 so a rerender still subscribes on the
// next tick rather than 200ms later.
function setup(settleMs = 0) {
  const sockets: FakeSocket[] = []
  const connect = () => {
    const socket = new FakeSocket()
    sockets.push(socket)
    return socket
  }
  function Harness({ bounds }: { bounds: Bounds | null }) {
    useMapSocket(bounds, { url: 'ws://test.invalid/api/ws', connect, settleMs })
    return <div>map</div>
  }
  return { sockets, Harness }
}

const tick = (ms: number) => new Promise((done) => setTimeout(done, ms))

test('connects once and subscribes when the camera reports its bounds', async () => {
  const { sockets, Harness } = setup()
  const view = render(<Harness bounds={null} />)
  expect(sockets).toHaveLength(1)
  const socket = sockets[0]
  expect(socket?.sent).toHaveLength(0)

  socket?.onopen?.()
  view.rerender(<Harness bounds={BOUNDS} />)
  await tick(0)
  expect(sockets).toHaveLength(1)
  expect(socket?.sent.map((raw) => JSON.parse(raw).category).sort()).toEqual([
    'gym',
    'pokemon',
  ])
})

test('unmounting closes the socket and empties the store', () => {
  const { sockets, Harness } = setup()
  const view = render(<Harness bounds={BOUNDS} />)
  sockets[0]?.onopen?.()
  sockets[0]?.onmessage?.({
    data: JSON.stringify({
      type: 'delta',
      category: 'gym',
      added: [{ id: 'gym-1', lat: 51.5, lon: -0.1, team_id: 2 }],
      changed: [],
      removed: [],
    }),
  })
  expect(useEntityStore.getState().gyms).toHaveLength(1)

  view.unmount()
  expect(sockets[0]?.closed).toBe(true)
  expect(useEntityStore.getState().gyms).toHaveLength(0)
})

test('a run of camera moves subscribes once, to where it came to rest', async () => {
  const { sockets, Harness } = setup(20)
  const view = render(<Harness bounds={null} />)
  const socket = sockets[0]
  socket?.onopen?.()

  // A flick pan or a run of zoom steps: several settled moves in quick
  // succession. Every one but the last is an area the user has already
  // left, and each would otherwise cost a full Golbat scan per category.
  for (const west of [-4, -3, -2]) {
    view.rerender(<Harness bounds={{ ...BOUNDS, west }} />)
    await tick(5)
  }
  expect(socket?.sent).toHaveLength(0)

  view.rerender(<Harness bounds={{ ...BOUNDS, west: -1 }} />)
  await tick(40)

  expect(socket?.sent).toHaveLength(2)
  const sent = (socket?.sent ?? []).map((raw) => JSON.parse(raw))
  expect(sent.map((message) => message.category).sort()).toEqual([
    'gym',
    'pokemon',
  ])
  for (const message of sent) {
    expect(message.viewport.min.lon).toBe(-1)
  }
})

test('onDelta sees each delta, after the store already has it', () => {
  const seen: unknown[] = []
  const sockets: FakeSocket[] = []
  const connect = () => {
    const socket = new FakeSocket()
    sockets.push(socket)
    return socket
  }
  function Harness() {
    useMapSocket(BOUNDS, {
      url: 'ws://test.invalid/api/ws',
      connect,
      settleMs: 0,
      onDelta: (delta) => {
        // Read the store from inside the callback: the rules half of an
        // envelope is only useful once the entity half has landed.
        seen.push({
          rulesVersion: delta.rulesVersion,
          gyms: useEntityStore.getState().gyms.length,
        })
      },
    })
    return <div>map</div>
  }

  render(<Harness />)
  sockets[0]?.onopen?.()
  sockets[0]?.onmessage?.({
    data: JSON.stringify({
      type: 'delta',
      category: 'gym',
      added: [{ id: 'gym-1', lat: 51.5, lon: -0.1, team_id: 2 }],
      changed: [],
      removed: [],
      rulesVersion: 7,
    }),
  })

  expect(seen).toEqual([{ rulesVersion: 7, gyms: 1 }])
})
