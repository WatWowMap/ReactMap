/**
 * The client end of `/api/ws`: one socket, both categories, and a
 * reconnect that does not lose or duplicate what the map is holding.
 *
 * Deliberately not a `MapSource`. That interface hands a consumer the
 * full current set on every change, which is exactly what the entity
 * store exists to avoid -- a full set per delta would rebuild deck.gl's
 * data array from scratch two seconds at a time. This client parses
 * frames and hands the batch to `onDelta`; the store decides what that
 * means.
 *
 * What happens across a reconnect: nothing. The store keeps everything
 * it has, and the new connection resubscribes with the viewport the
 * camera is on right now. The server starts a fresh diff for a new
 * connection, so the first batch after a reconnect re-delivers the whole
 * viewport as `added` -- which is an id-keyed merge over what is already
 * there, not a duplicate. Clearing on disconnect instead would blank the
 * map for the length of a blip and then repaint it, and on a Golbat with
 * `fort_in_memory` off it would be worse than that: gyms arrive only by
 * webhook, so a cleared gym set would stay empty until each gym happened
 * to change again. The cost of keeping is bounded staleness -- a removal
 * that happened while the socket was down is never re-reported -- and
 * that is the trade the task 7 report argues for.
 */

import type { Bounds } from './types'
import type { DeltaMessage, SubscribeMessage, WireCategory } from './wire'
import { isDeltaMessage, toWireViewport } from './wire'

/** The slice of `WebSocket` this module uses, so a test can stand in. */
export interface SocketLike {
  send(data: string): void
  close(): void
  onopen: (() => void) | null
  onmessage: ((event: { data: unknown }) => void) | null
  onclose: (() => void) | null
  onerror: (() => void) | null
}

export interface MapSocketOptions {
  url: string
  onDelta: (delta: DeltaMessage) => void
  connect?: (url: string) => SocketLike
  /** First reconnect wait; doubles per failed attempt up to a cap. */
  reconnectDelayMs?: number
}

export interface MapSocket {
  /** Subscribes, or updates the open subscriptions in place. */
  setViewport: (bounds: Bounds) => void
  close: () => void
}

const CATEGORIES: readonly WireCategory[] = ['pokemon', 'gym']
const DEFAULT_RECONNECT_DELAY_MS = 1_000
const MAX_RECONNECT_DELAY_MS = 30_000

/** `/api/ws` on the origin the app was served from. */
export function defaultSocketUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/api/ws`
}

export function createMapSocket({
  url,
  onDelta,
  connect = (target) => new WebSocket(target) as unknown as SocketLike,
  reconnectDelayMs = DEFAULT_RECONNECT_DELAY_MS,
}: MapSocketOptions): MapSocket {
  let socket: SocketLike | null = null
  let open = false
  let stopped = false
  let attempts = 0
  let bounds: Bounds | null = null
  let retryTimer: ReturnType<typeof setTimeout> | null = null

  function sendSubscriptions() {
    if (!open || !socket || !bounds) return
    const viewport = toWireViewport(bounds)
    for (const category of CATEGORIES) {
      const message: SubscribeMessage = {
        type: 'subscribe',
        category,
        viewport,
        // No rule engine on this branch yet, so nothing to filter by.
        filters: [],
      }
      socket.send(JSON.stringify(message))
    }
  }

  function scheduleReconnect() {
    if (stopped || retryTimer) return
    const delay = Math.min(
      reconnectDelayMs * 2 ** attempts,
      MAX_RECONNECT_DELAY_MS,
    )
    attempts += 1
    retryTimer = setTimeout(() => {
      retryTimer = null
      openSocket()
    }, delay)
  }

  function openSocket() {
    if (stopped) return
    const next = connect(url)
    socket = next
    open = false

    next.onopen = () => {
      open = true
      attempts = 0
      sendSubscriptions()
    }
    next.onmessage = (event) => {
      if (typeof event.data !== 'string') return
      let parsed: unknown
      try {
        parsed = JSON.parse(event.data)
      } catch {
        return
      }
      if (!isDeltaMessage(parsed)) return
      onDelta(parsed)
    }
    next.onclose = () => {
      open = false
      socket = null
      scheduleReconnect()
    }
    // A socket that errors also closes, so recovery lives in `onclose`
    // alone rather than racing itself from two handlers.
    next.onerror = () => undefined
  }

  openSocket()

  return {
    setViewport(next) {
      bounds = next
      sendSubscriptions()
    },
    close() {
      stopped = true
      if (retryTimer) clearTimeout(retryTimer)
      retryTimer = null
      socket?.close()
      socket = null
      open = false
    },
  }
}
