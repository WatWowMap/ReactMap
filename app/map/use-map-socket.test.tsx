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

function setup() {
  const sockets: FakeSocket[] = []
  const connect = () => {
    const socket = new FakeSocket()
    sockets.push(socket)
    return socket
  }
  function Harness({ bounds }: { bounds: Bounds | null }) {
    useMapSocket(bounds, { url: 'ws://test.invalid/api/ws', connect })
    return <div>map</div>
  }
  return { sockets, Harness }
}

test('connects once and subscribes when the camera reports its bounds', () => {
  const { sockets, Harness } = setup()
  const view = render(<Harness bounds={null} />)
  expect(sockets).toHaveLength(1)
  const socket = sockets[0]
  expect(socket?.sent).toHaveLength(0)

  socket?.onopen?.()
  view.rerender(<Harness bounds={BOUNDS} />)
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
