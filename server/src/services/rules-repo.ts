// server/src/services/rules-repo.ts
//
// Every read and write of a user's rules. Four things this module is strict
// about, because each of them is a correctness or authorisation bug rather
// than a matter of taste:
//
//   1. **Every mutation takes a `userId` and filters on it in the same
//      statement.** A rule id arriving from a client names a row, not a
//      permission. The ownership check and the write are one statement, so
//      there is no window between them, and a mutation naming rows the user
//      does not own throws rather than silently touching fewer rows.
//
//   2. **The `rules_version` bump is inside the same transaction as the
//      write.** A write that lands without its bump is invisible to every
//      other device the account has open -- they keep serving cached rules
//      forever, because nothing ever tells them their copy went stale. A
//      bump that lands without its write is merely a wasted refetch. Both
//      are avoided by never letting them be separate.
//
//   3. **A rule that names a species cannot carry exclusions.** An
//      exclusion carves a species out of a rule that would otherwise match
//      it; a rule already narrowed to one species has nothing to carve. The
//      UI hides the control, and this module refuses it regardless, because
//      the UI is not where an invariant lives.
//
//   4. **One row per species.** A twenty-five species selection is
//      twenty-five rules, identical but for their species. Grouping them
//      back into one card is the client's job (`app/rules/rule-grouping.ts`)
//      -- the server matches and stores singular rows, so an edit to one
//      species can never disturb the other twenty-four.
//
// `db` is `any` for the reason `db/drizzle.ts` gives at its own cache: two
// copies of `mysql2` resolve in this tree, so the real client type is not
// usable across module boundaries.

import { and, asc, eq, inArray, sql } from 'drizzle-orm'

import { profile, rule, ruleExclusion, rulePokemon } from '../db/rules-schema'

/** The default category, and the only one this plan's UI writes. */
const DEFAULT_CATEGORY = 'pokemon'

/**
 * The condition columns that live on `rule_pokemon` rather than on `rule`.
 * Splitting a flat input across the two tables is driven off this list, so
 * adding a condition column means touching one array rather than four
 * statements.
 */
const POKEMON_CONDITION_FIELDS = [
  'formId',
  'pvpTargetSpecies',
  'ivMin',
  'ivMax',
  'atkMin',
  'atkMax',
  'defMin',
  'defMax',
  'staMin',
  'staMax',
  'levelMin',
  'levelMax',
  'cpMin',
  'cpMax',
  'gender',
  'sizeMin',
  'sizeMax',
  'pvpLeague',
  'pvpRankMin',
  'pvpRankMax',
] as const

/** The columns on `rule` itself that a caller may set. */
const RULE_FIELDS = ['category', 'name', 'size', 'glow', 'notify'] as const

type PokemonConditionField = (typeof POKEMON_CONDITION_FIELDS)[number]

/**
 * A rule as a caller states it: the `rule` columns and the `rule_pokemon`
 * condition columns flattened together, plus the species this rule carves
 * out. `speciesId` is not here -- it is the argument that fans one input
 * into many rows.
 */
interface RuleInput
  extends Partial<Record<PokemonConditionField, number | null>> {
  category?: string
  name?: string
  size?: string | null
  glow?: string | null
  notify?: boolean
  /** Species ids excluded from an otherwise-matching any-species rule. */
  exclusions?: number[]
}

/** One rule as `listRules` returns it, joined flat across its three tables. */
interface StoredRule {
  id: number
  category: string
  name: string
  size: string | null
  glow: string | null
  notify: boolean
  speciesId: number | null
  formId: number | null
  pvpTargetSpecies: number | null
  ivMin: number | null
  ivMax: number | null
  atkMin: number | null
  atkMax: number | null
  defMin: number | null
  defMax: number | null
  staMin: number | null
  staMax: number | null
  levelMin: number | null
  levelMax: number | null
  cpMin: number | null
  cpMax: number | null
  gender: number | null
  sizeMin: number | null
  sizeMax: number | null
  pvpLeague: number | null
  pvpRankMin: number | null
  pvpRankMax: number | null
  exclusions: number[]
}

/** Splits a flat input into the two tables it is stored across. */
function splitInput(input: RuleInput) {
  const ruleValues: Record<string, unknown> = {}
  for (const field of RULE_FIELDS) {
    if (input[field] !== undefined) ruleValues[field] = input[field]
  }
  const conditionValues: Record<string, unknown> = {}
  for (const field of POKEMON_CONDITION_FIELDS) {
    if (input[field] !== undefined) conditionValues[field] = input[field]
  }
  return { ruleValues, conditionValues }
}

/**
 * Adds one to each profile's `rules_version`, filtered on its owner. Always
 * called with a transaction, never a pooled client -- see the module note.
 */
async function bumpRulesVersion(
  tx: any,
  userId: string,
  profileIds: number | number[],
): Promise<void> {
  const ids = Array.isArray(profileIds) ? profileIds : [profileIds]
  if (!ids.length) return
  // `rules_version = rules_version + 1` as a raw expression rather than a
  // read-then-write: the latter loses a bump whenever two devices save at
  // once, while letting the database do the arithmetic makes the increment
  // atomic under its own row lock.
  await tx
    .update(profile)
    .set({ rulesVersion: sql`${profile.rulesVersion} + 1` })
    .where(and(inArray(profile.id, ids), eq(profile.userId, userId)))
}

/** Throws unless `profileId` exists and belongs to `userId`. */
async function assertOwnsProfile(
  tx: any,
  userId: string,
  profileId: number,
): Promise<void> {
  const rows = await tx
    .select({ id: profile.id })
    .from(profile)
    .where(and(eq(profile.id, profileId), eq(profile.userId, userId)))
    .limit(1)
  if (!rows.length) {
    throw new Error(`Profile ${profileId} does not belong to this user`)
  }
}

/**
 * Resolves the profiles `ruleIds` belong to, and throws unless the user owns
 * every one of them. The select filters on `user_id` in the same statement
 * that reads the rows, so an id the caller does not own simply does not come
 * back and the count check fails.
 *
 * The plan gives each user one profile, but a set of ids spanning two would
 * need both bumped, so this answers with all of them rather than the first.
 */
async function assertOwnsRules(
  tx: any,
  userId: string,
  ruleIds: number[],
): Promise<number[]> {
  const rows = await tx
    .select({ id: rule.id, profileId: rule.profileId })
    .from(rule)
    .where(and(inArray(rule.id, ruleIds), eq(rule.userId, userId)))
  if (rows.length !== new Set(ruleIds).size) {
    throw new Error('One or more rules do not belong to this user')
  }
  return [...new Set<number>(rows.map((row: any) => row.profileId))]
}

/** The user's rules in one profile, flat, each with its exclusions. */
async function listRules(
  db: any,
  userId: string,
  profileId: number,
): Promise<StoredRule[]> {
  const rows = await db
    .select()
    .from(rule)
    .leftJoin(rulePokemon, eq(rulePokemon.ruleId, rule.id))
    .where(and(eq(rule.userId, userId), eq(rule.profileId, profileId)))
    .orderBy(asc(rule.id))
  if (!rows.length) return []

  const ruleIds = rows.map((row: any) => row.rule.id)
  const exclusionRows = await db
    .select()
    .from(ruleExclusion)
    .where(inArray(ruleExclusion.ruleId, ruleIds))

  const exclusionsByRule = new Map<number, number[]>()
  for (const row of exclusionRows) {
    const list = exclusionsByRule.get(row.ruleId) ?? []
    list.push(row.speciesId)
    exclusionsByRule.set(row.ruleId, list)
  }

  return rows.map((row: any) => {
    const conditions = row.rule_pokemon ?? {}
    const stored: Record<string, unknown> = {
      id: row.rule.id,
      category: row.rule.category,
      name: row.rule.name,
      size: row.rule.size,
      glow: row.rule.glow,
      notify: row.rule.notify,
      speciesId: conditions.speciesId ?? null,
      exclusions: exclusionsByRule.get(row.rule.id) ?? [],
    }
    for (const field of POKEMON_CONDITION_FIELDS) {
      stored[field] = conditions[field] ?? null
    }
    return stored as unknown as StoredRule
  })
}

/**
 * Writes one rule per entry in `speciesIds` -- `[null]` for a rule that
 * names no species at all -- and returns their new ids in the same order.
 */
async function createRules(
  db: any,
  userId: string,
  profileId: number,
  input: RuleInput,
  speciesIds: (number | null)[],
): Promise<number[]> {
  const exclusions = input.exclusions ?? []
  if (exclusions.length && speciesIds.some((speciesId) => speciesId != null)) {
    throw new Error(
      'A rule that names a species cannot carry an exclusion: there is nothing to exclude from',
    )
  }

  const { ruleValues, conditionValues } = splitInput(input)

  return db.transaction(async (tx: any) => {
    await assertOwnsProfile(tx, userId, profileId)

    const ids: number[] = []
    for (const speciesId of speciesIds) {
      const [result] = await tx.insert(rule).values({
        userId,
        profileId,
        category: input.category ?? DEFAULT_CATEGORY,
        ...ruleValues,
      })
      const ruleId: number = result.insertId
      ids.push(ruleId)

      await tx
        .insert(rulePokemon)
        .values({ ruleId, ...conditionValues, speciesId })

      if (exclusions.length) {
        await tx.insert(ruleExclusion).values(
          exclusions.map((speciesId) => ({
            ruleId,
            speciesId,
            formId: null,
          })),
        )
      }
    }

    await bumpRulesVersion(tx, userId, profileId)
    return ids
  })
}

/**
 * Applies one patch to every rule in `ruleIds`. This is what an edit to a
 * grouped card does: the client sends the whole group's ids and the one
 * field that changed, and the group splits or stays whole on its own.
 */
async function updateRules(
  db: any,
  userId: string,
  ruleIds: number[],
  patch: RuleInput,
): Promise<void> {
  if (!ruleIds.length) return
  const { ruleValues, conditionValues } = splitInput(patch)

  await db.transaction(async (tx: any) => {
    const profileIds = await assertOwnsRules(tx, userId, ruleIds)

    if (Object.keys(ruleValues).length) {
      await tx
        .update(rule)
        .set(ruleValues)
        .where(and(inArray(rule.id, ruleIds), eq(rule.userId, userId)))
    }
    if (Object.keys(conditionValues).length) {
      await tx
        .update(rulePokemon)
        .set(conditionValues)
        .where(inArray(rulePokemon.ruleId, ruleIds))
    }

    await bumpRulesVersion(tx, userId, profileIds)
  })
}

/** Removes rules and everything hanging off them. */
async function deleteRules(
  db: any,
  userId: string,
  ruleIds: number[],
): Promise<void> {
  if (!ruleIds.length) return

  await db.transaction(async (tx: any) => {
    const profileIds = await assertOwnsRules(tx, userId, ruleIds)

    await tx.delete(ruleExclusion).where(inArray(ruleExclusion.ruleId, ruleIds))
    await tx.delete(rulePokemon).where(inArray(rulePokemon.ruleId, ruleIds))
    await tx
      .delete(rule)
      .where(and(inArray(rule.id, ruleIds), eq(rule.userId, userId)))

    await bumpRulesVersion(tx, userId, profileIds)
  })
}

/**
 * The profile's current `rules_version`. This is the number a delta carries
 * so an open map can notice its cached rules went stale (Task 6).
 */
async function currentRulesVersion(
  db: any,
  profileId: number,
): Promise<number> {
  const [row] = await db
    .select({ rulesVersion: profile.rulesVersion })
    .from(profile)
    .where(eq(profile.id, profileId))
    .limit(1)
  if (!row) throw new Error(`No profile ${profileId}`)
  return row.rulesVersion
}

export type { RuleInput, StoredRule }
export {
  createRules,
  currentRulesVersion,
  deleteRules,
  listRules,
  POKEMON_CONDITION_FIELDS,
  RULE_FIELDS,
  updateRules,
}
