// server/src/services/golbat-webhook.ts
//
// Task 6 of the transport plan: turning one POST from Golbat's webhook
// sender into the injections a live subscription can deliver, and nothing
// else. Pure parsing -- no network, no registry, no socket. The HTTP side
// lives in `golbat-webhook-handler.ts`; the routing side lives in
// `subscription-registry.ts`.
//
// The wire shape, cited to Golbat rather than re-derived from ReactMap 1.x:
//
//   - Envelope: `webhooks/sender.go:21-25` (`webhookMessage`). Golbat POSTs
//     a JSON ARRAY of `{"type": string, "message": any}`. `Areas` carries
//     `json:"-"` and is never on the wire.
//   - Type strings: `webhooks/webhook.go:38-51`
//     (`webhookTypeToPayloadType`): gym_details, raid, quest, pokestop,
//     invasion, weather, fort_update, pokemon, max_battle, raid_lobby,
//     max_battle_lobby.
//   - `raid` -> `decoder/gym_state.go:165-195` (`RaidWebhook`).
//   - `gym_details` -> `decoder/gym_state.go:145-163` (`GymDetailsWebhook`).
//   - `fort_update` -> `decoder/fort.go:25-38` (`FortChangeWebhook`), whose
//     `change_type` is one of the constants at `decoder/fort.go:68-70`:
//     "new" | "removal" | "edit".
//
// Two divergences that bite if you assume the payloads are the same shape:
// a raid says `gym_id`/`team_id` where gym details says `id`/`team`, and
// `fort_update` tracks name/description/image/location ONLY -- never raid
// state. Raid state arrives on `raid`.
//
// What comes out: a PATCH, not a whole gym.
// ---------------------------------------------------------------------
// Each injection's `entity` carries only the fields its payload actually
// carried, projected onto Golbat's own `ApiGymResult` field names
// (`decoder/api_gym.go:139-183`) so a webhook-delivered gym and a
// scan-delivered gym speak the same vocabulary. It is deliberately NOT
// filled out to a complete `ApiGymResult` with nulls for the rest: a raid
// webhook genuinely does not know the gym's guarding pokemon or open
// slots, and emitting `null` for them would erase what the client already
// holds. The client merges a patch over the entity it has, which is the
// same thing `changed` already means in the delta protocol.
//
// Only gyms are produced. `pokestop`/`station` forts, quests, invasions,
// weather and pokemon are parsed far enough to be recognised and then
// dropped, because no subscribable category on this branch consumes them
// yet -- see `subscription-registry.ts`.

import crypto from 'crypto'

interface GymPatch {
  id: string
  [key: string]: unknown
}

interface UpsertInjection {
  category: 'gym'
  kind: 'upsert'
  entity: GymPatch
}

interface RemoveInjection {
  category: 'gym'
  kind: 'remove'
  id: string
}

type WebhookInjection = UpsertInjection | RemoveInjection

/** Golbat's `FortType.String()` values -- decoder/fort.go:43-53. */
const GYM_FORT_TYPE = 'gym'

/** decoder/fort.go:68-70. */
const FORT_CHANGE_REMOVAL = 'removal'

function isObject(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Copies `value` onto `target[key]` only when Golbat actually sent it, so
 * an absent field stays absent from the patch rather than becoming a
 * client-visible `null` that overwrites known-good state.
 */
function setIfPresent(target: GymPatch, key: string, value: unknown) {
  if (value === undefined || value === null) return
  target[key] = value
}

/**
 * Copies `value` only when it is neither absent nor Golbat's zero
 * sentinel for "unset".
 *
 * The webhook structs are plain `int64`/`string`
 * (decoder/gym_state.go:145-163,165-195) built out of nullable columns with
 * `.ValueOrZero()` (decoder/gym_state.go:225,267-296), so an unsponsored,
 * unpartnered, never-powered-up gym -- which is nearly all of them --
 * arrives carrying `sponsor_id: 0`, `partner_id: ""`, `guard_pokemon_id: 0`.
 * The scan API builds that same unset state with `.Ptr()`
 * (decoder/api_gym.go:146,170,171), i.e. JSON `null`. Passing the sentinel
 * through would make a pushed gym and a polled gym disagree about
 * identical state, and would light a sponsor or partner badge on an
 * ordinary gym the instant a raid fired on it.
 */
function setUnlessUnsetSentinel(target: GymPatch, key: string, value: unknown) {
  if (value === 0 || value === '') return
  setIfPresent(target, key, value)
}

/**
 * The power-up trio, which is unset as a group or not at all: Golbat ties
 * power-up state to the level, and a gym that was never powered up sends
 * all three as 0 where a scan sends all three as null. A real power-up
 * always has a non-zero level, so a genuine `power_up_points: 0` still
 * travels as long as it arrives with one.
 */
function setPowerUp(target: GymPatch, message: Record<string, any>) {
  if (
    !message.power_up_level &&
    !message.power_up_points &&
    !message.power_up_end_timestamp
  ) {
    return
  }
  setIfPresent(target, 'power_up_points', message.power_up_points)
  setIfPresent(target, 'power_up_level', message.power_up_level)
  setIfPresent(target, 'power_up_end_timestamp', message.power_up_end_timestamp)
}

/**
 * The change stamp for a webhook-built entity. Golbat's webhook payloads
 * carry no `updated` column (only the scan responses do -- see
 * delta-engine.ts on why `updated` is the stamp), so this is the moment
 * ReactMap learned of the change. Seconds, matching every other `updated`
 * on the wire.
 */
function receivedAtSeconds(): number {
  return Math.floor(Date.now() / 1000)
}

/** decoder/gym_state.go:165-195 -> decoder/api_gym.go:139-183. */
function raidToGymPatch(message: Record<string, any>): UpsertInjection | null {
  const id = typeof message.gym_id === 'string' ? message.gym_id : ''
  if (!id) return null

  const entity: GymPatch = { id, updated: receivedAtSeconds() }
  setIfPresent(entity, 'lat', message.latitude)
  setIfPresent(entity, 'lon', message.longitude)
  setIfPresent(entity, 'name', message.gym_name)
  setIfPresent(entity, 'url', message.gym_url)
  setIfPresent(entity, 'team_id', message.team_id)
  setIfPresent(entity, 'raid_spawn_timestamp', message.spawn)
  setIfPresent(entity, 'raid_battle_timestamp', message.start)
  setIfPresent(entity, 'raid_end_timestamp', message.end)
  setIfPresent(entity, 'raid_level', message.level)
  setIfPresent(entity, 'raid_pokemon_id', message.pokemon_id)
  setIfPresent(entity, 'raid_pokemon_cp', message.cp)
  setIfPresent(entity, 'raid_pokemon_gender', message.gender)
  setIfPresent(entity, 'raid_pokemon_form', message.form)
  setIfPresent(entity, 'raid_pokemon_alignment', message.alignment)
  setIfPresent(entity, 'raid_pokemon_costume', message.costume)
  setIfPresent(entity, 'raid_pokemon_evolution', message.evolution)
  setIfPresent(entity, 'raid_pokemon_move_1', message.move_1)
  setIfPresent(entity, 'raid_pokemon_move_2', message.move_2)
  setIfPresent(entity, 'raid_is_exclusive', message.is_exclusive)
  setIfPresent(entity, 'ex_raid_eligible', message.ex_raid_eligible)
  setUnlessUnsetSentinel(entity, 'sponsor_id', message.sponsor_id)
  // `partner_id` is a string on this payload and an int64 on gym details;
  // the scan response's own type is *string.
  setUnlessUnsetSentinel(entity, 'partner_id', message.partner_id)
  setPowerUp(entity, message)
  setIfPresent(entity, 'ar_scan_eligible', message.ar_scan_eligible)
  setIfPresent(entity, 'rsvps', message.rsvps)

  return { category: 'gym', kind: 'upsert', entity }
}

/** decoder/gym_state.go:145-163 -> decoder/api_gym.go:139-183. */
function gymDetailsToGymPatch(
  message: Record<string, any>,
): UpsertInjection | null {
  const id = typeof message.id === 'string' ? message.id : ''
  if (!id) return null

  const entity: GymPatch = { id, updated: receivedAtSeconds() }
  setIfPresent(entity, 'lat', message.latitude)
  setIfPresent(entity, 'lon', message.longitude)
  setIfPresent(entity, 'name', message.name)
  setIfPresent(entity, 'url', message.url)
  // `team`, not `team_id` -- the divergence noted in the module header.
  setIfPresent(entity, 'team_id', message.team)
  setUnlessUnsetSentinel(
    entity,
    'guarding_pokemon_id',
    message.guard_pokemon_id,
  )
  setIfPresent(entity, 'available_slots', message.slots_available)
  setIfPresent(entity, 'ex_raid_eligible', message.ex_raid_eligible)
  // `in_battle` is a Go bool on the webhook and an *int64 on the scan
  // response (decoder/api_gym.go:158), so the two would disagree on the
  // wire if this were passed straight through.
  if (typeof message.in_battle === 'boolean') {
    entity.in_battle = message.in_battle ? 1 : 0
  } else {
    setIfPresent(entity, 'in_battle', message.in_battle)
  }
  setUnlessUnsetSentinel(entity, 'sponsor_id', message.sponsor_id)
  // `partner_id` is an int64 here and a string on the raid payload; the
  // scan response's own type is *string. `createGymWebhooks`
  // (decoder/gym_state.go:215-244) never populates it on gym details at
  // all, so in practice it is always the 0 the sentinel rule drops.
  if (message.partner_id) {
    entity.partner_id = String(message.partner_id)
  }
  setPowerUp(entity, message)
  setIfPresent(entity, 'ar_scan_eligible', message.ar_scan_eligible)
  setIfPresent(entity, 'defenders', message.defenders)

  return { category: 'gym', kind: 'upsert', entity }
}

/** decoder/fort.go:23-38. Name/description/image/location only. */
function fortUpdateToInjection(
  message: Record<string, any>,
): WebhookInjection | null {
  const isRemoval = message.change_type === FORT_CHANGE_REMOVAL
  const fort = isRemoval ? message.old : (message.new ?? message.old)
  if (!isObject(fort)) return null
  // A fort's type never changes, so reading it off whichever side of the
  // change is present is safe.
  if (fort.type !== GYM_FORT_TYPE) return null
  const id = typeof fort.id === 'string' ? fort.id : ''
  if (!id) return null

  if (isRemoval) return { category: 'gym', kind: 'remove', id }

  const entity: GymPatch = { id, updated: receivedAtSeconds() }
  setIfPresent(entity, 'name', fort.name)
  setIfPresent(entity, 'description', fort.description)
  setIfPresent(entity, 'url', fort.image_url)
  if (isObject(fort.location)) {
    setIfPresent(entity, 'lat', fort.location.lat)
    setIfPresent(entity, 'lon', fort.location.lon)
  }

  return { category: 'gym', kind: 'upsert', entity }
}

/**
 * Parses one POST body from Golbat's webhook sender into the injections it
 * implies. Never throws: a batch is a mixed bag of types this branch does
 * not consume yet, and one unrecognised or malformed entry must not cost
 * the rest of the batch.
 */
function parseGolbatWebhookBatch(body: unknown): WebhookInjection[] {
  if (!Array.isArray(body)) return []

  const injections: WebhookInjection[] = []
  for (const entry of body) {
    if (!isObject(entry)) continue
    const { type, message } = entry
    if (!isObject(message)) continue

    let injection: WebhookInjection | null = null
    if (type === 'raid') injection = raidToGymPatch(message)
    else if (type === 'gym_details') injection = gymDetailsToGymPatch(message)
    else if (type === 'fort_update') injection = fortUpdateToInjection(message)
    // Everything else -- quest, pokestop, invasion, weather, pokemon,
    // max_battle, raid_lobby, max_battle_lobby, and anything a newer Golbat
    // invents -- has no subscribable category on this branch.

    if (injection) injections.push(injection)
  }
  return injections
}

/**
 * Constant-time comparison of a configured shared secret against the value
 * that arrived on the request header.
 *
 * A plain `===` on a secret leaks its length and its matching prefix
 * through timing, so the bytes are compared with `crypto.timingSafeEqual`.
 * That throws on unequal lengths, hence the explicit length guard -- which
 * does leak the length, and cannot not: there is no way to compare buffers
 * of different sizes in constant time without first padding to a length
 * that is itself a secret. Length alone is a far weaker leak than a
 * prefix oracle.
 *
 * The received value is trimmed first. Golbat's header parser
 * (`config/reader.go:163-175`) splits `"X-Foo: bar"` on ':' and does not
 * trim, so an operator who writes the pair with a space after the colon
 * sends the value `" bar"` and would otherwise never match.
 */
function secretMatches(expected: string, received: string | null): boolean {
  if (!expected || !received) return false
  const expectedBytes = Buffer.from(expected, 'utf8')
  const receivedBytes = Buffer.from(received.trim(), 'utf8')
  if (expectedBytes.length !== receivedBytes.length) return false
  return crypto.timingSafeEqual(expectedBytes, receivedBytes)
}

export type { GymPatch, RemoveInjection, UpsertInjection, WebhookInjection }
export { parseGolbatWebhookBatch, secretMatches }
