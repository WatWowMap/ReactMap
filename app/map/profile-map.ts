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

/**
 * Counters, for the questions timings cannot answer: how MANY times did
 * this happen during one pan? A render count is not a duration, and the
 * two get confused -- a hop that measures 0.2ms is not cheap if it runs
 * sixty times per drag.
 *
 * Same gate as the timings above, so off is a boolean check and a return.
 * Read them from the console with `__mapCounters()`, and zero them with
 * `__mapResetCounters()` so a count can be scoped to one gesture.
 */
const counters = new Map<string, number>()

export function profCount(name: string, by = 1): void {
  if (!enabled) return
  counters.set(name, (counters.get(name) ?? 0) + by)
}

export function profCounters(): Record<string, number> {
  return Object.fromEntries([...counters.entries()].sort())
}

/**
 * Zeroes the counts so the next gesture can be counted on its own. The
 * layer-data identity memory below is deliberately NOT cleared: it is
 * what "did this reference survive?" is asked against, and clearing it
 * would make the first `setProps` after a reset unanswerable.
 */
export function profResetCounters(): void {
  counters.clear()
}

/**
 * The reference-identity question the GPU actually cares about.
 *
 * deck.gl re-uploads a layer's buffers when its `data` prop changes
 * identity, and is cheap when a new `Layer` instance carries the SAME
 * `data`. Counting new `Layer` instances therefore says nothing on its
 * own; this counts, per layer id, how many of those instances arrived
 * with data deck.gl had already uploaded.
 */
const lastLayerData = new Map<string, unknown>()

/**
 * How many layers arrived with a new `data` reference on the most recent
 * call, so the frame timing below can be read against the amount of
 * re-upload that frame was asked for. Without it every frame figure is a
 * bare number with nothing to attribute it to.
 */
let lastNewData = 0

export function profTrackLayerData(
  layers: readonly { id: string; props?: { data?: unknown } }[],
): void {
  if (!enabled) return
  profCount('setProps calls')
  lastNewData = 0
  for (const layer of layers) {
    profCount('layer instances')
    const seen = lastLayerData.has(layer.id)
    const previous = lastLayerData.get(layer.id)
    const data = layer.props?.data
    lastLayerData.set(layer.id, data)
    if (!seen) continue
    const kept = previous === data
    if (!kept) lastNewData += 1
    profCount(`data ${kept ? 'kept' : 'NEW'}: ${layer.id}`)
  }
}

/**
 * What a `setProps` costs, which the identity counter above cannot say.
 *
 * `profTrackLayerData` answers whether a reference survived; it never
 * answers what replacing one costs, and "this data reference is new" is
 * only worth acting on next to a number. Two marks, because the work
 * lands in two different places:
 *
 * - `setProps (sync)` is deck.gl's own layer diff, on this call stack.
 * - `frame after setProps` is the frame that actually draws the result.
 *   The overlay is a maplibre custom layer, so deck renders inside the
 *   map's animation frame rather than here; attribute generation and the
 *   GPU upload for any layer whose `data` changed identity land in that
 *   frame. Measured start-of-frame to start-of-next-frame, so it carries
 *   whatever else that frame did -- it is an upper bound on the upload,
 *   not an isolated figure for it.
 *
 * `toFrame` is the wait for that first frame, and it is there to keep the
 * measurement honest rather than to describe the upload: a tab that is not
 * on screen gets no `requestAnimationFrame`, so a frame figure gathered
 * behind another window is meaningless. A `toFrame` around one refresh
 * interval says a real frame answered; a large one says the reading is not
 * about drawing at all and should be thrown away.
 */
export function profTimeSetProps(apply: () => void): void {
  if (!enabled) {
    apply()
    return
  }
  // Read here rather than inside the frame callback: another `setProps`
  // can land before that frame runs, and the figure has to belong to the
  // call this frame is being attributed to.
  const newData = lastNewData
  const at = performance.now()
  apply()
  profRecord('setProps (sync)', performance.now() - at, { newData })
  requestAnimationFrame(() => {
    const frameStart = performance.now()
    requestAnimationFrame(() => {
      profRecord('frame after setProps', performance.now() - frameStart, {
        newData,
        toFrame: Math.round((frameStart - at) * 10) / 10,
      })
    })
  })
}

if (enabled && typeof window !== 'undefined') {
  Object.assign(window, {
    __mapCounters: profCounters,
    __mapResetCounters: profResetCounters,
  })
}
