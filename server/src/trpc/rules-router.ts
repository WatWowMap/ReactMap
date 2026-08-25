// server/src/trpc/rules-router.ts
//
// The `rules.*` procedures: the only way a client reaches
// `services/rules-repo.ts`.
//
// Two things this router never takes from its input, no matter what the
// body says:
//
//   - **The user id.** It comes from `ctx.user`, which the context built
//     from a Better Auth session (`trpc/context.ts`). A user id on the wire
//     is a request to act as somebody else.
//   - **The profile id.** It is resolved server-side from that user's own
//     profiles. This plan gives each account exactly one, seeded on first
//     sign-in (`auth/seed-profile.ts`), so there is nothing for a client to
//     choose between and no reason to let it try.
//
// Rule ids DO arrive from the client -- an edit has to name the rows it is
// editing -- and the repository is what makes that safe: every mutation
// filters on the user id in the same statement, so an id belonging to
// someone else throws rather than being written.

import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { getDrizzle } from '../db/drizzle'
import { listSpecies } from '../services/masterfile'
import {
  createRules,
  deleteRules,
  findProfileId,
  listRules,
  updateRules,
} from '../services/rules-repo'
import { t } from './trpc-base'

// MySQL's signed INT range, which every condition column is (`db/rules-schema.ts`).
// Without it `z.number().int()` lets 2**53 through to an INT column, and an
// out-of-range value comes back as a 500 rather than the 400 it is.
const INT_MIN = -2_147_483_648
const INT_MAX = 2_147_483_647

/** A nullable integer condition column, absent when the caller says nothing. */
const condition = z
  .number()
  .int()
  .min(INT_MIN)
  .max(INT_MAX)
  .nullable()
  .optional()

/**
 * How many rules one request may name, and how many species one rule may
 * cover. Both are the species catalog with headroom: a rule per species is
 * a normal-sized selection under the one-row-per-species model, and the
 * catalog is around a thousand entries and grows by a few dozen a year.
 * Past that a request is not a selection anybody made in the picker.
 */
const MAX_SPECIES = 3000

/**
 * A cap on what one update can actually WRITE, which the two array
 * bounds above cannot express on their own: `replaceExclusions` inserts
 * one row per rule per exclusion, so their product is the row count, and
 * two individually-plausible arrays multiply into a transaction big
 * enough to exhaust the process and block every other rules write on the
 * instance while it runs.
 */
const MAX_EXCLUSION_ROWS = 20_000

/**
 * The `rule_pokemon` condition columns as they arrive on the wire: flat,
 * alongside the `rule` columns, exactly as `RuleInput` takes them.
 */
const conditionShape = {
  formId: condition,
  pvpTargetSpecies: condition,
  ivMin: condition,
  ivMax: condition,
  atkMin: condition,
  atkMax: condition,
  defMin: condition,
  defMax: condition,
  staMin: condition,
  staMax: condition,
  levelMin: condition,
  levelMax: condition,
  cpMin: condition,
  cpMax: condition,
  gender: condition,
  sizeMin: condition,
  sizeMax: condition,
  // The three caps `rule_pokemon.pvp_league` documents -- see rule-row.ts's
  // `LEAGUE_BY_CAP`, which silently drops the rank range for anything else.
  pvpLeague: z
    .union([z.literal(500), z.literal(1500), z.literal(2500)])
    .nullable()
    .optional(),
  pvpRankMin: condition,
  pvpRankMax: condition,
}

/** The `rule` columns a caller may set, at the lengths the table holds. */
const ruleShape = {
  category: z.string().max(16).optional(),
  name: z.string().min(1).max(64).optional(),
  size: z.string().max(8).nullable().optional(),
  glow: z.string().max(16).nullable().optional(),
  notify: z.boolean().optional(),
  enabled: z.boolean().optional(),
  exclusions: z.array(z.number().int()).max(MAX_SPECIES).optional(),
}

const createInput = z.object({
  ...ruleShape,
  ...conditionShape,
  name: z.string().min(1).max(64),
  // `[null]` is a rule that names no species. An empty array would write
  // nothing at all, which is a mistake rather than a request.
  speciesIds: z.array(z.number().int().nullable()).min(1).max(MAX_SPECIES),
})

const updateInput = z
  .object({
    ruleIds: z.array(z.number().int()).min(1).max(MAX_SPECIES),
    patch: z.object({ ...ruleShape, ...conditionShape }),
  })
  .refine(
    (input) =>
      input.ruleIds.length * (input.patch.exclusions?.length ?? 0) <=
      MAX_EXCLUSION_ROWS,
    {
      message: `An update may write at most ${MAX_EXCLUSION_ROWS} exclusion rows`,
      path: ['patch', 'exclusions'],
    },
  )

const deleteInput = z.object({
  ruleIds: z.array(z.number().int()).min(1).max(MAX_SPECIES),
})

/** The signed-in user, or a 401. */
function requireUserId(ctx: any): string {
  const userId = ctx.user?.id ?? ctx.session?.userId
  if (!userId) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Sign in to read or change rules',
    })
  }
  return userId
}

/** The user's profile, or a 404 for an account that has none yet. */
async function resolveProfileId(db: any, userId: string): Promise<number> {
  const profileId = await findProfileId(db, userId)
  if (profileId == null) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'This account has no profile yet',
    })
  }
  return profileId
}

/**
 * The database client. Taken off the context when a caller supplied one --
 * which is what a test does -- and otherwise the shared pooled client.
 */
function resolveDb(ctx: any) {
  return ctx.db ?? getDrizzle()
}

/** Resolves the two things no procedure here may read from its input. */
async function resolveOwner(ctx: any) {
  const userId = requireUserId(ctx)
  const db = resolveDb(ctx)
  return { db, userId }
}

const rulesRouter = t.router({
  list: t.procedure.query(async ({ ctx }) => {
    const { db, userId } = await resolveOwner(ctx)
    return listRules(db, userId, await resolveProfileId(db, userId))
  }),

  create: t.procedure.input(createInput).mutation(async ({ ctx, input }) => {
    const { db, userId } = await resolveOwner(ctx)
    const { speciesIds, ...rest } = input
    const ids = await createRules(
      db,
      userId,
      await resolveProfileId(db, userId),
      rest,
      speciesIds,
    )
    return { ids }
  }),

  update: t.procedure.input(updateInput).mutation(async ({ ctx, input }) => {
    const { db, userId } = await resolveOwner(ctx)
    await updateRules(db, userId, input.ruleIds, input.patch)
    return { ok: true }
  }),

  delete: t.procedure.input(deleteInput).mutation(async ({ ctx, input }) => {
    const { db, userId } = await resolveOwner(ctx)
    await deleteRules(db, userId, input.ruleIds)
    return { ok: true }
  }),
})

/**
 * The species/form catalog behind a rule's species picker and any display
 * that needs a name for a species/form id pair -- see
 * `services/masterfile.ts`. No user/profile scoping: the catalog is the
 * same for every signed-in caller.
 */
const masterfileRouter = t.router({
  species: t.procedure.query(() => listSpecies()),
})

export { masterfileRouter, rulesRouter }
