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
import type { MapSocket, SocketLike } from './socket-client'
import { createMapSocket, defaultSocketUrl } from './socket-client'
import type { Bounds } from './types'

export interface UseMapSocketOptions {
  url?: string
  connect?: (url: string) => SocketLike
}

export function useMapSocket(
  bounds: Bounds | null,
  { url, connect }: UseMapSocketOptions = {},
): void {
  const clientRef = useRef<MapSocket | null>(null)

  useEffect(() => {
    const client = createMapSocket({
      url: url ?? defaultSocketUrl(),
      onDelta: (delta) => useEntityStore.getState().applyDelta(delta),
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
    clientRef.current?.setViewport(bounds)
  }, [bounds])
}
