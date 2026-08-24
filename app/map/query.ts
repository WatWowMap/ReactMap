import type { MapEntity, MapQuery, MapSource, Unsubscribe } from './types'

/**
 * Reads a source once: takes the first delivered set and unsubscribes.
 *
 * A source may deliver that first set synchronously from inside
 * `subscribe`, before it has returned the unsubscribe function, so the
 * handler cannot always call it. The flag covers that case by
 * unsubscribing once the function is in hand.
 */
export function queryOnce(
  source: MapSource,
  request: MapQuery,
): Promise<MapEntity[]> {
  return new Promise((resolve) => {
    let settled = false
    let unsubscribe: Unsubscribe | undefined

    const stop = source.subscribe(request, (entities) => {
      if (settled) return
      settled = true
      resolve(entities)
      unsubscribe?.()
    })

    unsubscribe = stop
    if (settled) stop()
  })
}
