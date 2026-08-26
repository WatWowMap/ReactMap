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
import { eq } from 'drizzle-orm'

import { authAccount } from '../db/auth-schema'
import { getDrizzle } from '../db/drizzle'
import {
  createPoracleClient,
  type PoracleClient,
  poracleConfigured,
} from '../services/poracle-client'
import { type HumanState, resolveHumanState } from '../services/poracle-human'
import { type AlertsSnapshot, toAlertsSnapshot } from '../services/poracle-view'
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

/** This user's linked identities, and nobody else's. */
function listAccountRows(db: any, userId: string): Promise<AccountRow[]> {
  return db
    .select({
      providerId: authAccount.providerId,
      accountId: authAccount.accountId,
    })
    .from(authAccount)
    .where(eq(authAccount.userId, userId))
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

interface AlertsStatus {
  state: HumanState | 'unconfigured'
  pokemonBlocked?: boolean
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
    if (!client) return { state: 'unconfigured' }

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

    const res = await client.get(humanPath(platformId))
    if (res.status < 200 || res.status >= 300) return toAlertsSnapshot(null)
    return toAlertsSnapshot(res.body)
  }),
})

export type { AlertsStatus }
export { alertsRouter, pokemonBlocked, resolvePlatformId }
