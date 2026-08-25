/**
 * Timing instrumentation for the pan-to-markers path, off unless asked for.
 *
 * Enable with `localStorage.setItem('profileMap', '1')` and reload, or
 * `?profileMap=1`. Off, every call here is a boolean check and a return.
 *
 * The path being measured, hop by hop, is what a person actually waits
 * through after they stop dragging:
 *
 *   moveend -> (settle) -> subscribe -> (server scan) -> delta
 *           -> applyDelta -> React render -> layers -> deck.gl
 *
 * Each hop is attributed separately because they have completely different
 * fixes. A slow settle is one constant; a slow server leg is Golbat or the
 * poll interval; a slow apply is the store; a slow build is clustering.
 * "The map feels sluggish" does not distinguish them and guessing between
 * them wastes a round of work.
 */

interface Mark {
  hop: string
  ms: number
  detail?: Record<string, number | string>
}

const enabled = (() => {
  if (typeof window === 'undefined') return false
  try {
    if (new URLSearchParams(window.location.search).get('profileMap') === '1') {
      return true
    }
    return window.localStorage.getItem('profileMap') === '1'
  } catch {
    return false
  }
})()

/** Open spans by name, so a hop can be closed from a different module. */
const open = new Map<string, number>()
const marks: Mark[] = []

export function profilingMap(): boolean {
  return enabled
}

export function profStart(name: string): void {
  if (!enabled) return
  open.set(name, performance.now())
}

/**
 * Closes a span and records it. A span closed without being opened is
 * ignored rather than recorded as zero, because a zero would read as "this
 * hop is free" when it actually means "this hop was never measured".
 */
export function profEnd(
  name: string,
  hop: string,
  detail?: Record<string, number | string>,
): void {
  if (!enabled) return
  const started = open.get(name)
  if (started === undefined) return
  open.delete(name)
  marks.push({
    hop,
    ms: Math.round((performance.now() - started) * 10) / 10,
    ...(detail ? { detail } : {}),
  })
  report()
}

/** Records a hop whose duration the caller measured itself. */
export function profRecord(
  hop: string,
  ms: number,
  detail?: Record<string, number | string>,
): void {
  if (!enabled) return
  marks.push({
    hop,
    ms: Math.round(ms * 10) / 10,
    ...(detail ? { detail } : {}),
  })
  report()
}

let reportTimer: ReturnType<typeof setTimeout> | null = null

/**
 * Batches to the end of the turn so one pan prints one table rather than a
 * line per hop interleaved with everything else on the console.
 */
function report(): void {
  if (reportTimer) return
  reportTimer = setTimeout(() => {
    reportTimer = null
    if (marks.length === 0) return
    const rows = marks.splice(0, marks.length)
    const total = rows.reduce((sum, row) => sum + row.ms, 0)
    // eslint-disable-next-line no-console
    console.table(
      rows.map((row) => ({
        hop: row.hop,
        ms: row.ms,
        ...(row.detail ?? {}),
      })),
    )
    // eslint-disable-next-line no-console
    console.log(`[map] measured hops total ${Math.round(total)}ms`)
    ;(window as unknown as { __mapProfile?: Mark[] }).__mapProfile = [
      ...((window as unknown as { __mapProfile?: Mark[] }).__mapProfile ?? []),
      ...rows,
    ]
  }, 0)
}
