/**
 * Owns one live `/api/ws` connection for as long as the map is mounted,
 * and points it at whatever the camera currently frames.
 *
 * Deltas go straight into the entity store through `getState()`, not
 * through a subscription: this hook writes to the store and never reads
 * it, so the component that calls it does not re-render when data
 * arrives. The components that draw re-render because they select the
 * arrays they draw, which is where the subscription belongs.
 */

import { useEffect, useRef } from 'react'
import { useEntityStore } from './entity-store'
import { profCount, profilingMap, profRecord } from './profile-map'
import type { MapSocket, SocketLike } from './socket-client'
import { createMapSocket, defaultSocketUrl } from './socket-client'
import type { Bounds } from './types'
import type { DeltaMessage } from './wire'

export interface UseMapSocketOptions {
  url?: string
  connect?: (url: string) => SocketLike
  /** Overridable so a test does not have to wait out the real delay. */
  settleMs?: number
  /**
   * Called with each delta AFTER the store has it, for whatever the
   * envelope carries that is not entity data -- today that is
   * `rulesVersion` and the `matched` ids, which is how a rule edited on
   * another device reaches this map (`rules-query.ts`'s
   * `applyDeltaWithRules`). Held in a ref, so a caller may pass a fresh
   * closure every render without reconnecting the socket.
   */
  onDelta?: (delta: DeltaMessage) => void
}

/**
 * How long the camera has to sit still before the new bounds are sent.
 *
 * Zero, because the premise this existed for was wrong. It was added to
 * coalesce "a flick pan or a run of zoom steps" into one subscribe, on the
 * assumption that a pan fires several `moveend` events. It does not:
 * MapLibre fires `moveend` once when movement stops, inertia included, so
 * a drag was always exactly one subscribe and the delay bought nothing.
 * What it cost was a floor under every pan -- measured at 201ms against a
 * 212ms poll, so roughly half the wait, to coalesce events that were not
 * arriving.
 *
 * Repeated zoom-button clicks are the one case that really does fire
 * several in a row. An extra scan there is cheaper than taxing every pan,
 * which is why this is zero rather than a smaller non-zero number.
 *
 * Still routed through a timer rather than removed: a zero-delay timeout
 * defers to the next macrotask, which batches the two categories' sends
 * within one tick, and it keeps the knob for anyone who finds a case that
 * needs it.
 */
const VIEWPORT_SETTLE_MS = 0

export function useMapSocket(
  bounds: Bounds | null,
  {
    url,
    connect,
    settleMs = VIEWPORT_SETTLE_MS,
    onDelta,
  }: UseMapSocketOptions = {},
): void {
  const clientRef = useRef<MapSocket | null>(null)
  const onDeltaRef = useRef(onDelta)
  onDeltaRef.current = onDelta

  useEffect(() => {
    const client = createMapSocket({
      url: url ?? defaultSocketUrl(),
      onDelta: (delta) => {
        profCount(`socket delta: ${delta.category}`)
        useEntityStore.getState().applyDelta(delta)
        onDeltaRef.current?.(delta)
      },
      ...(connect ? { connect } : {}),
    })
    clientRef.current = client
    return () => {
      client.close()
      clientRef.current = null
      // Nothing is feeding the store any more, so leaving entities in it
      // would show a remounted map a snapshot of a connection that no
      // longer exists. This is the one place the store is emptied -- a
      // reconnect deliberately is not.
      useEntityStore.getState().clear()
    }
  }, [url, connect])

  useEffect(() => {
    if (!bounds) return
    const requestedAt = profilingMap() ? performance.now() : 0
    const timer = setTimeout(() => {
      // Time actually spent waiting for the camera to stop, which is the
      // settle constant plus however long React took to hand us new bounds.
      profRecord('settle wait', performance.now() - requestedAt)
      clientRef.current?.setViewport(bounds)
    }, settleMs)
    // A move that lands before the timer fires replaces it, so only the
    // bounds the camera actually came to rest on are ever sent.
    return () => clearTimeout(timer)
  }, [bounds, settleMs])
}
