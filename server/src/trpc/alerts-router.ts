// server/src/trpc/alerts-router.ts
//
// The `alerts.*` procedures: everything the Alerts tab reads from Poracle.
//
// Neither procedure takes an input at all, and that is the point. Poracle
// scopes every endpoint by the `{id}` path segment, so whatever ReactMap puts
// there is the identity Poracle acts as. That value is the Discord account id
// linked to this session and nothing else -- a client that could influence it
// would be reading and writing somebody else's subscriptions (spec 7.4).
//
// Nothing Poracle returns reaches a client unmodified either: every response
// goes through `services/poracle-view.ts`, which builds its output from
// explicit literals. 1.x leaked nothing here only because the GraphQL schema
// declared no matching fields, and tRPC prunes nothing on the way out.

import type { Poracle } from '@rm/types'
import { TRPCError } from '@trpc/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { authAccount } from '../db/auth-schema'
import { getDrizzle } from '../db/drizzle'
import {
  createPoracleClient,
  type PoracleClient,
  poracleConfigured,
} from '../services/poracle-client'
import { type HumanState, resolveHumanState } from '../services/poracle-human'
import {
  type AlertsSnapshot,
  type LocationView,
  toAlertRow,
  toAlertsSnapshot,
} from '../services/poracle-view'
import { requirePerm } from './require-perm'
import { type Context, t } from './trpc-base'

/** Poracle's own name for the pokemon category, in config and in a human row. */
const MONSTER = 'monster'

/** Better Auth's name for the provider whose account id Poracle keys on. */
const DISCORD = 'discord'

interface AccountRow {
  providerId: string
  accountId: string
}

interface PlatformIdDeps {
  listAccounts?: (db: any, userId: string) => Promise<AccountRow[]>
}

/**
 * This user's linked identities, and nobody else's.
 *
 * Ordered because two Discord rows under one user id are schema-legal: the
 * unique index is (issuer, account_id), not (user_id, provider_id). Both ids
 * belong to the same person, so nothing can be impersonated, but an unordered
 * SELECT could return them in either order and a flip would move that person's
 * subscriptions between two Poracle humans -- writes go to this id, and the
 * human-state cache is keyed on the user rather than on it.
 */
function listAccountRows(db: any, userId: string): Promise<AccountRow[]> {
  return db
    .select({
      providerId: authAccount.providerId,
      accountId: authAccount.accountId,
    })
    .from(authAccount)
    .where(eq(authAccount.userId, userId))
    .orderBy(authAccount.accountId)
}

/**
 * The Poracle human id for this account: the id of its linked Discord
 * identity, read from Better Auth's own account table.
 *
 * Never a column on the user row that something else wrote once, and never a
 * value off the wire. This return value becomes the `{id}` path segment, which
 * is the identity Poracle acts as, so which row it picks is the whole
 * impersonation boundary (spec 7.4).
 *
 * The provider choice is made here rather than in the WHERE clause so that it
 * is one decision a test can reach: an account with a Telegram row and a
 * Discord row is ordinary, and the table has no order that puts Discord first.
 */
async function resolvePlatformId(
  db: any,
  userId: string,
  deps: PlatformIdDeps = {},
): Promise<string | null> {
  const rows = await (deps.listAccounts ?? listAccountRows)(db, userId)
  const discord = rows.find((row) => row.providerId === DISCORD)
  return discord?.accountId ?? null
}

/**
 * Poracle stores a human's blocked categories as a JSON-encoded array in a
 * text column, and the column is null for most accounts. A malformed or
 * missing value blocks nothing rather than throwing: 1.x read this field off a
 * possibly-undefined human and threw, which is how a dead Poracle became an
 * empty tab with dead buttons.
 */
function parseBlockedAlerts(value: any): string[] {
  if (Array.isArray(value)) return value.filter((a) => typeof a === 'string')
  if (typeof value !== 'string') return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed)
      ? parsed.filter((a) => typeof a === 'string')
      : []
  } catch {
    return []
  }
}

/**
 * Whether pokemon alerts are off limits for this human.
 *
 * 1.x's `getAllowedCategories` subtraction, reduced to the one category this
 * plan ships: the operator's `disabledHooks` turns it off for everyone, and
 * the human's own `blocked_alerts` turns it off for them. The read side calls
 * this to tell a client the tab is read-only; the write side calls the same
 * function to refuse. If the two ever computed it separately they could
 * disagree about who is blocked, which is worse than either answer alone.
 */
function pokemonBlocked(
  poracleConfig: Partial<Poracle> | null | undefined,
  human: any,
): boolean {
  const disabled = poracleConfig?.disabledHooks ?? []
  if (disabled.includes(MONSTER)) return true
  return parseBlockedAlerts(human?.blocked_alerts).includes(MONSTER)
}

function humanPath(platformId: string): string {
  return `/v2/humans/${encodeURIComponent(platformId)}`
}

/**
 * The only endpoint that can fill the tab.
 *
 * `humanPath` returns the human record and nothing else -- no tracking, no
 * profiles, no locations -- so a snapshot taken from it renders every panel
 * empty. Both query params are load-bearing too: without `all_profiles` the
 * rules come back for the active profile only, and without
 * `include_descriptions` every rule's description is null.
 */
function trackingPath(platformId: string): string {
  return `${humanPath(platformId)}/tracking?all_profiles=true&include_descriptions=true`
}

/** The collection every pokemon rule is created in, listed under, and lives in. */
function pokemonPath(platformId: string): string {
  return `${humanPath(platformId)}/tracking/pokemon`
}

/** One profile, by number, under this human. */
function profilePath(platformId: string, profileNo: number): string {
  return `${humanPath(platformId)}/profiles/${profileNo}`
}

/** This human's selectable areas. */
function areasPath(platformId: string): string {
  return `${humanPath(platformId)}/areas`
}

/** This human's saved locations. */
function locationsPath(platformId: string): string {
  return `${humanPath(platformId)}/locations`
}

/** One saved location, by label. Poracle matches the label case-insensitively. */
function locationPath(platformId: string, label: string): string {
  return `${locationsPath(platformId)}/${encodeURIComponent(label)}`
}

/**
 * `areas`, with every entry the operator listed in `poracleConfig.areasToSkip`
 * removed.
 *
 * 1.x normalised `areasToSkip` to lowercase at boot and compared
 * case-insensitively; Poracle itself already lowercases every area name it
 * stores (`v2SetAreasBody`, `v2_humans.go`), so the only side left to
 * lowercase here is the operator's own list.
 */
function withoutSkippedAreas(
  areas: string[],
  poracleConfig: Partial<Poracle> | null | undefined,
): string[] {
  const skip = new Set(
    (poracleConfig?.areasToSkip ?? []).map((area) => area.toLowerCase()),
  )
  return areas.filter((area) => !skip.has(area.toLowerCase()))
}

/**
 * The Poracle client for this request, or `null` when there is no Poracle.
 *
 * An explicit `null` on the context is the context saying so; only a context
 * that carries no such field at all falls back to the config, so a caller can
 * hand in a fake without the real one being consulted.
 */
function clientFor(ctx: Context): PoracleClient | null {
  if (ctx.poracleClient !== undefined) return ctx.poracleClient
  return poracleConfigured() ? createPoracleClient() : null
}

function platformIdFor(ctx: Context, userId: string): Promise<string | null> {
  if (ctx.platformId !== undefined) return Promise.resolve(ctx.platformId)
  return resolvePlatformId(ctx.db ?? getDrizzle(), userId)
}

/** The raw human row, or `null` when Poracle will not give one up. */
async function readHuman(
  client: PoracleClient,
  platformId: string,
): Promise<any> {
  try {
    const res = await client.get(humanPath(platformId))
    if (res.status < 200 || res.status >= 300) return null
    return res.body?.human ?? null
  } catch {
    return null
  }
}

// --- writes ---------------------------------------------------------------

/**
 * The signed INT range every one of Poracle's filter columns is. Without a
 * bound `z.number().int()` lets 2**53 through to an INT column, and Poracle
 * answers that with a 500 rather than the 400 it is.
 */
const INT_MIN = -2_147_483_648
const INT_MAX = 2_147_483_647

/**
 * How many rules one create may carry. Poracle diffs the whole batch against
 * the profile's existing rules inside a single transaction, so an unbounded
 * array is a request that holds that transaction open for as long as it likes.
 * A rule per species with headroom is past anything the picker can produce.
 */
const MAX_RULES = 3000

/** A filter a caller may leave unset: absent and null both mean Poracle's default. */
const filter = z.number().int().min(INT_MIN).max(INT_MAX).nullable().optional()

/**
 * The fields of one rule, named as `AlertRow` names them so a rule a client
 * read back can be edited and sent again without translating twice.
 *
 * Every filter is optional, Poracle's own strict-request rule: an omitted
 * field is that filter's documented default, which is what makes a PUT a full
 * replace rather than a patch. `pokemonId` is the exception, because it is the
 * one field Poracle requires. Requiring it here too refuses the rule before it
 * costs a round trip, and keeps every later consumer of `AlertInput` from
 * inheriting an optional field that is not really optional.
 *
 * Absent from it on purpose: `ping`, which Poracle stores server-side and
 * ignores on the way in, and `uid`, which is Poracle's to assign.
 */
const alertRuleShape = {
  // Not `filter`: a rule names exactly one species, and 0 is not a Pokedex id.
  pokemonId: z.number().int().min(1).max(INT_MAX),
  form: filter,
  costume: filter,
  distance: filter,
  template: z.string().max(64).nullable().optional(),
  clean: z.boolean().nullable().optional(),
  overrideLocationLabel: z.string().max(255).nullable().optional(),
  ivMin: filter,
  ivMax: filter,
  cpMin: filter,
  cpMax: filter,
  levelMin: filter,
  levelMax: filter,
  atkMin: filter,
  atkMax: filter,
  defMin: filter,
  defMax: filter,
  staMin: filter,
  staMax: filter,
  gender: z.enum(['any', 'male', 'female', 'genderless']).nullable().optional(),
  weightMin: filter,
  weightMax: filter,
  minTime: filter,
  rarityMin: filter,
  rarityMax: filter,
  sizeMin: filter,
  sizeMax: filter,
  pvpLeague: filter,
  pvpRankBest: filter,
  pvpRankWorst: filter,
  pvpMinCp: filter,
  pvpCap: filter,
}

/**
 * The column each input field lands in on Poracle's side.
 *
 * This map is also the allowlist: `toPoracleRule` walks it rather than the
 * request, so a key a client invents never reaches the wire. That matters more
 * than it looks -- Poracle's v2 request schema rejects an unknown property, so
 * a stray field is a 422 on a rule the client meant to save.
 *
 * `profileNo` is deliberately not here. It is a query parameter, not a rule
 * field, and Poracle would reject it in a body.
 */
const POKEMON_WIRE_NAMES: Record<keyof typeof alertRuleShape, string> = {
  pokemonId: 'pokemon_id',
  form: 'form',
  costume: 'costume',
  distance: 'distance',
  template: 'template',
  clean: 'clean',
  overrideLocationLabel: 'override_location_label',
  ivMin: 'min_iv',
  ivMax: 'max_iv',
  cpMin: 'min_cp',
  cpMax: 'max_cp',
  levelMin: 'min_level',
  levelMax: 'max_level',
  atkMin: 'atk',
  atkMax: 'max_atk',
  defMin: 'def',
  defMax: 'max_def',
  staMin: 'sta',
  staMax: 'max_sta',
  gender: 'gender',
  weightMin: 'min_weight',
  weightMax: 'max_weight',
  minTime: 'min_time',
  rarityMin: 'rarity',
  rarityMax: 'max_rarity',
  sizeMin: 'size',
  sizeMax: 'max_size',
  pvpLeague: 'pvp_ranking_league',
  pvpRankBest: 'pvp_ranking_best',
  pvpRankWorst: 'pvp_ranking_worst',
  pvpMinCp: 'pvp_ranking_min_cp',
  pvpCap: 'pvp_ranking_cap',
}

const alertInput = z.object({
  ...alertRuleShape,
  // The profile this rule belongs to. Checked against the human's own profiles
  // before it is forwarded -- Poracle does not check it (see `resolveProfile`).
  profileNo: z.number().int().min(0).max(INT_MAX).optional(),
})

type AlertInput = z.infer<typeof alertInput>

/**
 * What a create did, counted rather than listed.
 *
 * Poracle's create cannot name the rules it made. `ApplyDiff` throws away the
 * uid `Insert` returns, so a created row carries uid 0 and an updated row
 * carries the uid that was just deleted to make it -- only PUT stamps a real
 * one. Returning those rows would hand a client an identifier for a row that
 * does not exist and invite it to edit or delete by it.
 *
 * Counts are what can be said truthfully: how many were new, how many
 * replaced one already there, and how many were already exactly that rule.
 * A client that needs the rules themselves refetches the snapshot, which is
 * the only place a uid can be trusted. Fixing this properly is a change to
 * Poracle, not to ReactMap.
 */
interface AlertWriteResult {
  created: number
  updated: number
  unchanged: number
}

/**
 * One rule, in Poracle's spelling.
 *
 * Built by walking the allowlist rather than the request, so the output holds
 * the fields this module knows about and nothing else. An unset field is left
 * out entirely: Poracle reads an omitted field as its documented default, and
 * a key present with `undefined` marshals to nothing useful either way.
 */
function toPoracleRule(rule: AlertInput): Record<string, unknown> {
  const body: Record<string, unknown> = {}
  for (const [field, column] of Object.entries(POKEMON_WIRE_NAMES)) {
    const value = (rule as Record<string, unknown>)[field]
    if (value !== undefined) body[column] = value
  }
  return body
}

/**
 * The stored fields a full replace must put back, because nothing on the way
 * in can carry them.
 *
 * Poracle's PUT is a full replace and `translateV2Pokemon` defaults every
 * omitted field, so anything `alertRuleShape` does not accept is destroyed by
 * an edit rather than left alone. `clean` is the sharp one: the column is a
 * bitmask packed from (clean, edit, summary), so a rule saved with `clean`
 * alone clears the other two bits. Someone who set "keep updated in place"
 * from the Discord bot would lose it the moment they touched that rule in the
 * tab, with nothing to tell them.
 *
 * `override_areas` is conditional, because Poracle rejects it alongside a
 * distance or a location label (`validateOverrideFields`). Carrying it back
 * regardless would turn every edit that picks a radius into a 422, and a user
 * picking a radius is a user replacing the areas.
 *
 * A field Poracle projected as `null` is at its default and is left out: a
 * replace that omits it lands on the same default.
 */
function carriedForward(row: any, rule: AlertInput): Record<string, unknown> {
  const carried: Record<string, unknown> = {}
  for (const column of ['edit', 'summary', 'pvp_ranking_evolution']) {
    if (row?.[column] !== null && row?.[column] !== undefined) {
      carried[column] = row[column]
    }
  }
  const areas = row?.override_areas
  const areasConflict =
    (rule.distance ?? 0) > 0 || (rule.overrideLocationLabel ?? '').length > 0
  if (!areasConflict && Array.isArray(areas) && areas.length > 0) {
    carried.override_areas = areas
  }
  return carried
}

/** How many rules Poracle put in one bucket of its diff response. */
function countRules(list: unknown): number {
  return Array.isArray(list) ? list.length : 0
}

/** The uids of the rules Poracle reports it deleted, and nothing else. */
function deletedUids(list: unknown): number[] {
  const rows = Array.isArray(list) ? list : []
  return rows.map((row) => toAlertRow(row).uid)
}

/**
 * The snapshot a write is authorized against.
 *
 * A write cannot degrade to an empty tab the way the reads do: the blocked
 * check and the profile check both read this body, so a write that proceeded
 * without it would be a write with neither check performed.
 */
async function readSnapshotForWrite(
  client: PoracleClient,
  platformId: string,
): Promise<any> {
  let res: { status: number; body: any }
  try {
    res = await client.get(trackingPath(platformId))
  } catch {
    throw new TRPCError({
      code: 'SERVICE_UNAVAILABLE',
      message: 'Alerts are unavailable right now',
    })
  }
  if (res.status < 200 || res.status >= 300) {
    throw new TRPCError({
      code: 'SERVICE_UNAVAILABLE',
      message: `Alerts are unavailable right now (Poracle returned ${res.status})`,
    })
  }
  return res.body
}

/**
 * The profile this write lands in.
 *
 * Poracle's `resolveHuman` takes `?profile` off the query string and uses it
 * without checking the human owns that profile, so this is the only check
 * there is (spec 7.4). Both sides of the comparison come from the snapshot,
 * which is Poracle's own answer for this human -- never from the request.
 */
function resolveProfile(body: any, requested: number | undefined): number {
  const view = toAlertsSnapshot(body)
  const active = view.human.currentProfileNo
  if (requested === undefined) return active
  const owned =
    requested === active ||
    view.profiles.some((profile) => profile.profileNo === requested)
  if (!owned) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'That profile is not one of yours',
    })
  }
  return requested
}

/**
 * The one profile a batch writes to.
 *
 * Poracle's create endpoint takes a single `?profile` for the whole body, so a
 * batch naming two profiles cannot be honoured. Refusing is the only honest
 * answer: writing them all to the first rule's profile would silently move
 * rules between profiles.
 */
function batchProfile(rules: AlertInput[]): number | undefined {
  const requested = [
    ...new Set(
      rules
        .map((rule) => rule.profileNo)
        .filter((no): no is number => no !== undefined),
    ),
  ]
  if (requested.length > 1) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'One profile per batch: save each profile separately',
    })
  }
  return requested[0]
}

interface WriteSession {
  client: PoracleClient
  platformId: string
  /**
   * The raw snapshot the write is authorized against, kept rather than
   * projected. Two things a write needs are deliberately not in
   * `AlertsSnapshot`: the human's `blocked_alerts`, and the stored value of
   * every field `alertRuleShape` does not accept (see `carriedForward`).
   */
  body: any
}

/** `WriteSession` under a name that fits the profile procedures below --
 *  the same three fields, gathered the same way, but without the pokemon
 *  category being relevant to any of them. */
type ProfileSession = WriteSession

/**
 * The perm, the identity to act as, and (for the procedures that need it) the
 * profile list to validate a `profileNo` against -- everything a profile or
 * human-level write needs before it may touch Poracle, minus the
 * pokemon-category refusal that only ever applied to alert rules.
 */
async function requireClientAndPlatform(
  ctx: Context,
): Promise<{ userId: string; client: PoracleClient; platformId: string }> {
  const userId = requirePerm(ctx, 'alerts')
  const client = clientFor(ctx)
  if (!client) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Alerts are not configured on this server',
    })
  }
  const platformId = await platformIdFor(ctx, userId)
  if (!platformId) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Link a Discord account to use Alerts',
    })
  }
  return { userId, client, platformId }
}

/** `requireClientAndPlatform`, plus the snapshot every profile procedure
 *  validates a `profileNo` against via `resolveProfile`. */
async function beginProfileSession(ctx: Context): Promise<ProfileSession> {
  const { client, platformId } = await requireClientAndPlatform(ctx)
  const body = await readSnapshotForWrite(client, platformId)
  return { client, platformId, body }
}

/**
 * Everything a rule write needs before it may touch Poracle: the perm, the
 * identity to act as, the blocked-category refusal, and the profile.
 *
 * The blocked check is `pokemonBlocked`, the same function `status` answers
 * with. The read side stays open -- someone whose alerts are blocked can still
 * see what they are subscribed to -- and only the writes refuse.
 */
async function beginWrite(ctx: Context): Promise<WriteSession> {
  const session = await beginProfileSession(ctx)
  if (pokemonBlocked(ctx.poracleConfig, session.body?.human)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Pokemon alerts are blocked for this account',
    })
  }
  return session
}

/**
 * The stored rule a by-uid write addresses, and the profile it lives in.
 *
 * The profile is taken from the rule rather than from the request, and that is
 * the fix for a whole class of nonsense: Poracle's `v2FindOwnedRow` scopes by
 * profile, the tab reads its rules with `all_profiles=true`, and a write with
 * no profile goes to the active one. So a rule the tab listed from a
 * non-active profile would be deleted "successfully" against the wrong scope
 * and come back 404 -- a missing argument presenting as data corruption.
 * Nothing a client sends can select the profile here, so nothing can omit it
 * either.
 *
 * A uid that is not in the snapshot is refused before the round trip. Poracle
 * would 404 it too; doing it here means the answer does not depend on which of
 * the two checks the request happens to reach first.
 */
function findRule(body: any, uid: number): { row: any; profileNo: number } {
  const rules = Array.isArray(body?.tracking?.pokemon)
    ? body.tracking.pokemon
    : []
  const row = rules.find((rule: any) => rule?.uid === uid)
  if (!row) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'That alert was not found',
    })
  }
  const view = toAlertsSnapshot(body)
  const profileNo =
    typeof row.profile_no === 'number'
      ? row.profile_no
      : view.human.currentProfileNo
  return { row, profileNo }
}

/**
 * The query string every write carries.
 *
 * `silent=true` is not an optimization, and it belongs on all three writes.
 * Poracle pushes a confirmation for a create, an edit and a delete alike, so
 * without it somebody working in the Alerts tab is messaged about each thing
 * they just did in the Alerts tab -- once per rule, on whatever platform they
 * linked.
 *
 * The profile is resolved server side by `beginWrite` and sent explicitly
 * rather than left to Poracle's active-profile fallback, so which profile a
 * write landed in is never ambiguous.
 */
function writeQuery(profileNo: number): string {
  return `?silent=true&profile=${profileNo}`
}

/**
 * A write, with Poracle's answer turned into something a client can act on.
 *
 * The reads degrade to an empty tab on purpose; a write may not. A save that
 * quietly did nothing is the worst of the three outcomes, so every non-2xx
 * becomes an error. The status is all that is reported -- never the response
 * body, which is Poracle's internals.
 */
async function sendWrite(
  client: PoracleClient,
  method: 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown,
  // Overridable because a 404 here does not always mean the same thing:
  // an alert-rule write 404s on a uid, a profile write 404s on a
  // profile_no, and telling a client "alert" when it asked about a
  // profile is confusing in exactly the way this whole module exists to
  // avoid.
  notFoundMessage = 'That alert was not found',
): Promise<any> {
  let res: { status: number; body: any }
  try {
    res = await client.send(method, path, body)
  } catch {
    throw new TRPCError({
      code: 'SERVICE_UNAVAILABLE',
      message: 'Alerts could not be saved right now',
    })
  }
  if (res.status === 404) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: notFoundMessage,
    })
  }
  if (res.status < 200 || res.status >= 300) {
    throw new TRPCError({
      code: 'BAD_GATEWAY',
      message: `Alerts could not be saved (Poracle returned ${res.status})`,
    })
  }
  return res.body
}

interface AlertsStatus {
  state: HumanState | 'unconfigured'
  pokemonBlocked: boolean
}

const alertsRouter = t.router({
  /**
   * Whether this account can use Alerts at all, and on what terms.
   *
   * Three states rather than two, because "there is no Poracle", "there is no
   * human for you" and "Poracle is not answering" are different answers and
   * 1.x could tell none of them apart.
   */
  status: t.procedure.query(async ({ ctx }): Promise<AlertsStatus> => {
    const userId = requirePerm(ctx, 'alerts')
    const client = clientFor(ctx)
    if (!client) {
      // Carried on every branch, including this one: a client reading
      // `!status.pokemonBlocked` would otherwise take a missing key as a
      // grant.
      return {
        state: 'unconfigured',
        pokemonBlocked: pokemonBlocked(ctx.poracleConfig, null),
      }
    }

    const platformId = await platformIdFor(ctx, userId)
    if (!platformId) {
      return {
        state: 'absent',
        pokemonBlocked: pokemonBlocked(ctx.poracleConfig, null),
      }
    }

    const state = await resolveHumanState(client, userId, platformId)
    // Only a human that exists has a `blocked_alerts` to read; for the other
    // two states the operator's config is the whole answer.
    const human =
      state === 'present' ? await readHuman(client, platformId) : null
    return { state, pokemonBlocked: pokemonBlocked(ctx.poracleConfig, human) }
  }),

  /**
   * Everything the tab renders, in one read.
   *
   * An account with no Poracle, no linked Discord identity, or no human gets
   * an empty snapshot rather than an error: there is nothing to show, and a
   * thrown error here is the tab that renders as a dead panel.
   */
  snapshot: t.procedure.query(async ({ ctx }): Promise<AlertsSnapshot> => {
    const userId = requirePerm(ctx, 'alerts')
    const client = clientFor(ctx)
    if (!client) return toAlertsSnapshot(null)

    const platformId = await platformIdFor(ctx, userId)
    if (!platformId) return toAlertsSnapshot(null)

    try {
      const res = await client.get(trackingPath(platformId))
      if (res.status < 200 || res.status >= 300) return toAlertsSnapshot(null)
      const snapshot = toAlertsSnapshot(res.body)
      return {
        ...snapshot,
        human: {
          ...snapshot.human,
          // `config.poracle.areasToSkip` lets an operator hide an area from
          // everyone; distance = 0 means "use my areas", so an area offered
          // here silently becomes geographic scope the operator meant to
          // hide.
          areas: withoutSkippedAreas(snapshot.human.areas, ctx.poracleConfig),
        },
      }
    } catch {
      // A Poracle that is not answering is an empty tab, the same way
      // `readHuman` already degrades. Throwing here turns a restart into an
      // error page, and `status` has already told the client what is wrong.
      return toAlertsSnapshot(null)
    }
  }),

  /**
   * Create rules, and update the ones the batch turns out to already cover.
   *
   * Answers in counts, not rules: Poracle's create cannot name what it made.
   * See `AlertWriteResult`.
   */
  create: t.procedure
    // `.min(1)`: Poracle answers an empty body with a 422, so an empty batch
    // is a round trip that can only fail. It is also a request nobody meant to
    // make -- a save with nothing in it is a bug in the caller.
    .input(z.object({ rules: z.array(alertInput).min(1).max(MAX_RULES) }))
    .mutation(async ({ ctx, input }): Promise<AlertWriteResult> => {
      const session = await beginWrite(ctx)
      const profileNo = resolveProfile(session.body, batchProfile(input.rules))
      const path = `${pokemonPath(session.platformId)}${writeQuery(profileNo)}`
      const body = await sendWrite(
        session.client,
        'POST',
        path,
        input.rules.map(toPoracleRule),
      )
      return {
        created: countRules(body?.created),
        updated: countRules(body?.updated),
        unchanged: countRules(body?.unchanged),
      }
    }),

  /**
   * Replace one rule, and hand back the uid it now has.
   *
   * Poracle's PUT is documented as delete plus insert, and its diff-update
   * path does the same thing, so no Poracle write preserves a uid. Returning
   * the one we were given would leave a client pointing at a row that no
   * longer exists, invalidated by its own save.
   *
   * The uid on the way in is safe to take from a client: every by-uid endpoint
   * resolves the row through Poracle's own ownership check and 404s a uid this
   * human does not own.
   */
  replace: t.procedure
    .input(z.object({ uid: z.number().int(), rule: alertInput }))
    .mutation(async ({ ctx, input }): Promise<{ uid: number }> => {
      const session = await beginWrite(ctx)
      const { row, profileNo } = findRule(session.body, input.uid)
      if (
        input.rule.profileNo !== undefined &&
        input.rule.profileNo !== profileNo
      ) {
        // PUT deletes and re-inserts within one profile, and the ownership
        // check that finds the old row is scoped to it. A rule cannot move.
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'A rule cannot be moved between profiles',
        })
      }
      const path = `${pokemonPath(session.platformId)}/${input.uid}${writeQuery(profileNo)}`
      const body = await sendWrite(session.client, 'PUT', path, {
        ...carriedForward(row, input.rule),
        ...toPoracleRule(input.rule),
      })
      const uid = body?.updated?.[0]?.uid
      if (typeof uid !== 'number') {
        throw new TRPCError({
          code: 'BAD_GATEWAY',
          message: 'Poracle replaced the rule without naming its new uid',
        })
      }
      return { uid }
    }),

  /**
   * Delete one rule, and report the uids that actually went.
   *
   * No profile on the input: it comes from the rule, so a rule the tab listed
   * from a non-active profile is deletable rather than a 404.
   */
  remove: t.procedure
    .input(z.object({ uid: z.number().int() }))
    .mutation(async ({ ctx, input }): Promise<{ deleted: number[] }> => {
      const session = await beginWrite(ctx)
      const { profileNo } = findRule(session.body, input.uid)
      const path = `${pokemonPath(session.platformId)}/${input.uid}${writeQuery(profileNo)}`
      const body = await sendWrite(session.client, 'DELETE', path)
      return { deleted: deletedUids(body?.deleted) }
    }),

  /**
   * The master switch: whether Poracle sends this human anything at all.
   *
   * Poracle's `/enable` and `/disable` both answer `{ status: "ok" }`, so the
   * response is the flag the caller asked for, not anything read off the
   * wire -- there is nothing on the wire worth reading.
   */
  setEnabled: t.procedure
    .input(z.object({ enabled: z.boolean() }))
    .mutation(async ({ ctx, input }): Promise<{ enabled: boolean }> => {
      const { client, platformId } = await requireClientAndPlatform(ctx)
      const path = `${humanPath(platformId)}/${input.enabled ? 'enable' : 'disable'}`
      await sendWrite(
        client,
        'POST',
        path,
        undefined,
        'That account was not found',
      )
      return { enabled: input.enabled }
    }),

  /**
   * Makes one of this human's own profiles active.
   *
   * `resolveProfile` is the ownership check spec 7.4 requires: Poracle's
   * `?profile` (and, here, this endpoint's `profile_no` body field) is taken
   * on trust, with nothing on Poracle's side confirming the human asking owns
   * it. The number this returns is the one that was just validated, not
   * anything Poracle sent back -- its response is `{ status: "ok" }` and
   * nothing else.
   */
  switchProfile: t.procedure
    .input(z.object({ profileNo: z.number().int().min(0).max(INT_MAX) }))
    .mutation(async ({ ctx, input }): Promise<{ currentProfileNo: number }> => {
      const session = await beginProfileSession(ctx)
      const profileNo = resolveProfile(session.body, input.profileNo)
      const path = `${humanPath(session.platformId)}/profile`
      await sendWrite(
        session.client,
        'POST',
        path,
        { profile_no: profileNo },
        'That profile was not found',
      )
      return { currentProfileNo: profileNo }
    }),

  /**
   * Creates a profile.
   *
   * Poracle assigns `profile_no` itself -- the lowest number not already in
   * use -- and its create response is `{ status: "ok" }`, naming nothing.
   * Recovering that number by re-listing profiles before and after would only
   * be a guess dressed up as data: two adds racing, or another client's own
   * write landing between the two reads, both make it wrong. `create` already
   * answers this same gap by having the caller refetch the snapshot, which is
   * the only place a profile number can be trusted; this does the same.
   */
  addProfile: t.procedure
    .input(z.object({ name: z.string().min(1).max(255) }))
    .mutation(async ({ ctx, input }): Promise<{ added: true }> => {
      const { client, platformId } = await requireClientAndPlatform(ctx)
      const path = `${humanPath(platformId)}/profiles`
      await sendWrite(
        client,
        'POST',
        path,
        { name: input.name },
        'That account was not found',
      )
      return { added: true }
    }),

  /**
   * Deletes one of this human's own profiles, along with its tracking rules.
   *
   * Poracle reassigns the human's active profile itself when the deleted one
   * was active, so the number this returns is only ever the one that was
   * deleted -- confirmation, not a claim about what is active now. A client
   * that needs to know the new active profile refetches the snapshot the same
   * way every other profile-shaped write here does.
   */
  deleteProfile: t.procedure
    .input(z.object({ profileNo: z.number().int().min(0).max(INT_MAX) }))
    .mutation(async ({ ctx, input }): Promise<{ deleted: number }> => {
      const session = await beginProfileSession(ctx)
      const profileNo = resolveProfile(session.body, input.profileNo)
      const path = profilePath(session.platformId, profileNo)
      await sendWrite(
        session.client,
        'DELETE',
        path,
        undefined,
        'That profile was not found',
      )
      return { deleted: profileNo }
    }),

  /**
   * Replaces every tracking rule in `toProfileNo` with a copy of
   * `fromProfileNo`'s. Named for what Poracle's endpoint actually does --
   * `POST .../profiles/{to}/copy` with `{ from_profile }` in the body --
   * rather than for what the old one-argument shape implied. It is a
   * destructive overwrite of an existing destination profile, not a way to
   * duplicate one: `toProfileNo` must already exist, and whatever it was
   * tracking before this call is gone.
   *
   * Both numbers are validated against the human's own profiles, not just the
   * destination -- an owned destination fed a `fromProfileNo` belonging to
   * somebody else would still be a read of that person's rule set, even
   * though nothing about it is returned to the caller.
   *
   * A self-copy (`fromProfileNo === toProfileNo`) is refused before the round
   * trip rather than merely discouraged client-side. `CopyProfile`
   * (`store/human_sql.go`) runs, per tracking table, a `DELETE ... WHERE
   * profile_no = toProfile` and only then a `SELECT ... WHERE profile_no =
   * fromProfile`: when the two numbers are equal, the delete empties the
   * profile and the select that was meant to repopulate it finds nothing --
   * every rule in it gone, with a 200 back. The client-side guard
   * (`human-panel.tsx`) exists so nobody has to find that out; this one
   * exists because a refusal a client can choose not to send is not a
   * refusal.
   */
  copyProfileRules: t.procedure
    .input(
      z.object({
        fromProfileNo: z.number().int().min(0).max(INT_MAX),
        toProfileNo: z.number().int().min(0).max(INT_MAX),
      }),
    )
    .mutation(async ({ ctx, input }): Promise<{ toProfileNo: number }> => {
      const session = await beginProfileSession(ctx)
      const fromProfileNo = resolveProfile(session.body, input.fromProfileNo)
      const toProfileNo = resolveProfile(session.body, input.toProfileNo)
      if (fromProfileNo === toProfileNo) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message:
            'Copying a profile into itself would delete every rule in it',
        })
      }
      const path = `${profilePath(session.platformId, toProfileNo)}/copy`
      await sendWrite(
        session.client,
        'POST',
        path,
        { from_profile: fromProfileNo },
        'That profile was not found',
      )
      return { toProfileNo }
    }),

  /**
   * This human's selectable areas: `GET /v2/humans/{id}/areas`, already
   * community-filtered by Poracle when `area_security` is on, further cut by
   * `withoutSkippedAreas` so an operator-hidden area is never offered as a
   * choice -- see the module comment. Existing to back a picker, not a bare
   * text field: a picker built from this list cannot produce a name Poracle
   * will drop, which is what makes `setAreas`'s own divergence (below)
   * unreachable rather than merely correctable after the fact.
   */
  availableAreas: t.procedure.query(
    async ({ ctx }): Promise<{ areas: string[] }> => {
      const { client, platformId } = await requireClientAndPlatform(ctx)
      let res: { status: number; body: any }
      try {
        res = await client.get(areasPath(platformId))
      } catch {
        throw new TRPCError({
          code: 'SERVICE_UNAVAILABLE',
          message: 'Alerts are unavailable right now',
        })
      }
      if (res.status < 200 || res.status >= 300) {
        throw new TRPCError({
          code: 'SERVICE_UNAVAILABLE',
          message: `Alerts are unavailable right now (Poracle returned ${res.status})`,
        })
      }
      const rows = Array.isArray(res.body?.areas) ? res.body.areas : []
      const names = rows
        .map((row: any) => (typeof row?.name === 'string' ? row.name : ''))
        .filter((name: string) => name.length > 0)
      return { areas: withoutSkippedAreas(names, ctx.poracleConfig) }
    },
  ),

  /**
   * Sets this human's selected areas -- what a `distance = 0` alert actually
   * fires against.
   *
   * Poracle's own endpoint already lowercases, dedups and intersects against
   * what this human may select; `withoutSkippedAreas` additionally drops
   * anything the operator listed in `areasToSkip`, so a hidden area cannot be
   * selected here either, not only left off the read side.
   *
   * The returned `areas` is what was *sent*, not a report of what Poracle
   * *kept* -- its response here is `{ status: "ok" }` and names nothing, and
   * Poracle's own intersection against this human's allowed set can still
   * drop an entry this filter let through (a fence that stopped being
   * user-selectable between `availableAreas` being read and this call, for
   * instance). A caller that treats this return value as ground truth can
   * end up showing a human areas that were never actually stored -- exactly
   * the class of silent divergence `deleteLocation`'s refusal exists to
   * prevent for saved locations. `useAlerts.setAreas` does not trust it: it
   * refetches the snapshot instead, the same answer `create` already reaches
   * for the same reason (`AlertCreateResult`'s own comment).
   */
  setAreas: t.procedure
    .input(z.object({ areas: z.array(z.string().max(255)).max(1000) }))
    .mutation(async ({ ctx, input }): Promise<{ areas: string[] }> => {
      const { client, platformId } = await requireClientAndPlatform(ctx)
      const areas = withoutSkippedAreas(input.areas, ctx.poracleConfig)
      await sendWrite(
        client,
        'POST',
        areasPath(platformId),
        { areas },
        'That account was not found',
      )
      return { areas }
    }),

  /**
   * Creates a saved location. Poracle's response is `{ status: "ok" }`, so
   * what is returned is what was just saved, not anything read off the wire.
   */
  addLocation: t.procedure
    .input(
      z.object({
        label: z.string().min(1).max(255),
        latitude: z.number(),
        longitude: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }): Promise<LocationView> => {
      const { client, platformId } = await requireClientAndPlatform(ctx)
      await sendWrite(
        client,
        'POST',
        locationsPath(platformId),
        { label: input.label, lat: input.latitude, lon: input.longitude },
        'That account was not found',
      )
      return {
        label: input.label,
        latitude: input.latitude,
        longitude: input.longitude,
      }
    }),

  /**
   * Overwrites the coordinates of an existing saved location. Poracle 404s a
   * label that does not exist, and its response otherwise names nothing, so
   * this echoes the coordinates that were just saved.
   */
  updateLocation: t.procedure
    .input(
      z.object({
        label: z.string().min(1).max(255),
        latitude: z.number(),
        longitude: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }): Promise<LocationView> => {
      const { client, platformId } = await requireClientAndPlatform(ctx)
      await sendWrite(
        client,
        'PUT',
        locationPath(platformId, input.label),
        { lat: input.latitude, lon: input.longitude },
        'That location was not found',
      )
      return {
        label: input.label,
        latitude: input.latitude,
        longitude: input.longitude,
      }
    }),

  /**
   * Deletes a saved location -- refused when any alert still anchors to it.
   *
   * `override_location_label` names a row here, and Poracle's own
   * `resolveOverride` (`matching/generic.go`) falls back to the person's
   * default position, silently and without error, when the label it holds no
   * longer resolves. So a delete that proceeded anyway would not break the
   * alert -- it would leave it running, quietly measuring from the wrong
   * place, which is worse than a delete that failed loudly. The label is
   * matched case-insensitively, the same way Poracle's own locations
   * endpoints do.
   */
  deleteLocation: t.procedure
    .input(z.object({ label: z.string().min(1).max(255) }))
    .mutation(async ({ ctx, input }): Promise<{ deleted: string }> => {
      const { client, platformId } = await requireClientAndPlatform(ctx)
      const body = await readSnapshotForWrite(client, platformId)
      const label = input.label.toLowerCase()
      const inUse = toAlertsSnapshot(body).alerts.some(
        (alert) => (alert.overrideLocationLabel ?? '').toLowerCase() === label,
      )
      if (inUse) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'That location is in use by an alert and cannot be deleted',
        })
      }
      await sendWrite(
        client,
        'DELETE',
        locationPath(platformId, input.label),
        undefined,
        'That location was not found',
      )
      return { deleted: input.label }
    }),
})

export type { AlertInput, AlertsStatus, AlertWriteResult }
export {
  alertRuleShape,
  alertsRouter,
  POKEMON_WIRE_NAMES,
  pokemonBlocked,
  resolvePlatformId,
}
