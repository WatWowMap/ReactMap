/**
 * The wire vocabulary of `/api/ws`, and nothing else: the two message
 * shapes the socket carries, plus the guards that decide whether a frame
 * off the network is one of them.
 *
 * Everything here is Golbat's vocabulary, snake_case and all. Nothing in
 * this module knows about `PokemonEntity` or `GymEntity` -- turning one
 * into the other is `./translate`, which is the single seam between the
 * two languages. See the task 7 report for why the seam is on this side
 * of the socket rather than the server's.
 */

export type WireCategory = 'pokemon' | 'gym'

/** One Golbat-shaped entity, or the patch of one. Read through `./translate`. */
export type RawEntity = Record<string, unknown>

/** The corner pair `map-subscription.ts` expects on a subscribe. */
export interface WireViewport {
  min: { lat: number; lon: number }
  max: { lat: number; lon: number }
}

export interface SubscribeMessage {
  type: 'subscribe'
  category: WireCategory
  viewport: WireViewport
  filters: object[]
}

/**
 * An all-empty delta is a real message, not a no-op: it is the subscribe
 * acknowledgement. A gym subscription against a Golbat with
 * `fort_in_memory` off sends exactly this and then nothing until a
 * webhook lands, so a client that treated it as "the server has no gyms"
 * would be reading silence as an empty world.
 */
export interface DeltaMessage {
  type: 'delta'
  category: WireCategory
  added: RawEntity[]
  changed: RawEntity[]
  removed: string[]
  /**
   * One integer per envelope, not per entity -- stamped by
   * `map-subscription.ts` whenever rules drove this poll. A rule edited
   * elsewhere bumps it without changing any rule's id, which is the case
   * `rules-query.ts`'s staleness check needs a version for: an unknown
   * matched id alone cannot see an edit. Optional because a subscription
   * rules do not drive (an anonymous connection, or a gym category today
   * -- see the task 6 report) never stamps one, and every fixture built
   * before this field existed still constructs a valid `DeltaMessage`
   * without it.
   */
  rulesVersion?: number
}

const CATEGORIES: readonly string[] = ['pokemon', 'gym']

function isRawEntityArray(value: unknown): value is RawEntity[] {
  return (
    Array.isArray(value) &&
    value.every(
      (entry) =>
        typeof entry === 'object' && entry !== null && !Array.isArray(entry),
    )
  )
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((id) => typeof id === 'string')
}

export function isDeltaMessage(value: unknown): value is DeltaMessage {
  if (typeof value !== 'object' || value === null) return false
  const message = value as Record<string, unknown>
  return (
    message.type === 'delta' &&
    typeof message.category === 'string' &&
    CATEGORIES.includes(message.category) &&
    isRawEntityArray(message.added) &&
    isRawEntityArray(message.changed) &&
    isStringArray(message.removed) &&
    (message.rulesVersion === undefined ||
      typeof message.rulesVersion === 'number')
  )
}

/** Client `Bounds` in the corner-pair shape the server subscribes with. */
export function toWireViewport(bounds: {
  west: number
  south: number
  east: number
  north: number
}): WireViewport {
  return {
    min: { lat: bounds.south, lon: bounds.west },
    max: { lat: bounds.north, lon: bounds.east },
  }
}
