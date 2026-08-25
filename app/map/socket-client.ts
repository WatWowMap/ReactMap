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

import { profEnd, profStart } from './profile-map'
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
  /** How long a handshake may take before the attempt is abandoned. */
  connectTimeoutMs?: number
}

export interface MapSocket {
  /** Subscribes, or updates the open subscriptions in place. */
  setViewport: (bounds: Bounds) => void
  close: () => void
}

const ALL_CATEGORIES: readonly WireCategory[] = ['pokemon', 'gym']

/**
 * Which categories to subscribe to, narrowable for looking at one layer on
 * its own:
 *
 *   localStorage.setItem('mapCategories', 'pokemon')   // then reload
 *   ?mapCategories=pokemon
 *
 * Unset means all of them, which is the only behaviour production ever
 * sees. A name that is not a real category is ignored rather than sent, so
 * a typo shows up as a missing layer rather than a rejected subscribe.
 */
function subscribedCategories(): readonly WireCategory[] {
  if (typeof window === 'undefined') return ALL_CATEGORIES
  let raw: string | null = null
  try {
    raw =
      new URLSearchParams(window.location.search).get('mapCategories') ??
      window.localStorage.getItem('mapCategories')
  } catch {
    return ALL_CATEGORIES
  }
  if (!raw) return ALL_CATEGORIES
  const wanted = raw.split(',').map((name) => name.trim())
  const kept = ALL_CATEGORIES.filter((category) => wanted.includes(category))
  return kept.length > 0 ? kept : ALL_CATEGORIES
}

const CATEGORIES: readonly WireCategory[] = subscribedCategories()
const DEFAULT_RECONNECT_DELAY_MS = 1_000
const MAX_RECONNECT_DELAY_MS = 30_000
// A handshake that never completes is the one failure this client cannot
// see. Recovery hangs off `onclose`, and a socket parked in CONNECTING
// has not closed -- a proxy that accepts the TCP connection and then
// answers the upgrade as ordinary HTTP leaves it there with no `open`,
// no `error` and no `close` at all, so nothing retries and the map stays
// silently empty. Ten seconds is far longer than a real upgrade takes
// and short enough that a wedged attempt turns into an ordinary retry.
const DEFAULT_CONNECT_TIMEOUT_MS = 10_000

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
  connectTimeoutMs = DEFAULT_CONNECT_TIMEOUT_MS,
}: MapSocketOptions): MapSocket {
  let socket: SocketLike | null = null
  let open = false
  let stopped = false
  let attempts = 0
  let bounds: Bounds | null = null
  let retryTimer: ReturnType<typeof setTimeout> | null = null
  let connectTimer: ReturnType<typeof setTimeout> | null = null

  function clearConnectTimer() {
    if (connectTimer) clearTimeout(connectTimer)
    connectTimer = null
  }

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
      // One span per category: the two subscriptions are independent
      // requests and the server answers them on different schedules.
      profStart(`server-leg:${category}`)
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

    connectTimer = setTimeout(() => {
      connectTimer = null
      // Only ever the socket this attempt created. Detaching the handlers
      // first means the close it may eventually report cannot schedule a
      // second reconnect on top of the one below, or on top of a healthy
      // connection that replaced it in the meantime.
      if (socket !== next || open) return
      next.onopen = null
      next.onmessage = null
      next.onclose = null
      next.onerror = null
      socket = null
      next.close()
      scheduleReconnect()
    }, connectTimeoutMs)

    next.onopen = () => {
      clearConnectTimer()
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
      profEnd(
        `server-leg:${parsed.category}`,
        `server leg (${parsed.category})`,
        {
          added: (parsed.added ?? []).length,
          removed: (parsed.removed ?? []).length,
          kb: Math.round(event.data.length / 102.4) / 10,
        },
      )
      onDelta(parsed)
    }
    next.onclose = () => {
      clearConnectTimer()
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
      clearConnectTimer()
      socket?.close()
      socket = null
      open = false
    },
  }
}
