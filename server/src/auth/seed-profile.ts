// server/src/auth/seed-profile.ts

import { log, TAGS } from '@rm/logger'
import { eq } from 'drizzle-orm'

import { getDrizzle } from '../db/drizzle'
import { profile, rule, rulePokemon } from '../db/rules-schema'

/** The one profile every account starts with. */
const DEFAULT_PROFILE_NAME = 'Default'

/**
 * The rule a fresh account gets: category `pokemon`, no conditions at all.
 * Every `rule_pokemon` column other than the rule id stays NULL, and a NULL
 * condition is "no opinion", so the row matches every pokemon. That is what
 * makes a first sign-in show a populated map instead of an empty one.
 */
const DEFAULT_RULE_NAME = 'Everything'

/**
 * Gives a user their first profile and its Everything rule, once.
 *
 * The guard is the absence of a profile rather than a fixed marker row: a
 * user who has since renamed, replaced or added profiles still has at least
 * one, so re-running this can never resurrect a rule they deleted on
 * purpose.
 *
 * All three rows are written in one transaction. Half a seed -- a profile
 * with no rule -- would pass the guard on every later sign-in while still
 * showing an empty map, which is the failure this whole function exists to
 * prevent.
 *
 * Called from the `session.create.after` hook in `auth/index.ts` rather than
 * on account creation, because `scripts/backfill-auth-users.ts` writes
 * `auth_user` rows directly and migrated 1.x users therefore never pass
 * through creation at all.
 */
// `db` is `any` for the reason `db/drizzle.ts` gives at its own cache: two
// copies of `mysql2` resolve in this tree, so the real client type is not
// usable across module boundaries.
async function seedProfileForUser(db: any, userId: string): Promise<void> {
  const existing = await db
    .select({ id: profile.id })
    .from(profile)
    .where(eq(profile.userId, userId))
    .limit(1)
  if (existing.length) return

  await db.transaction(async (tx: any) => {
    const [profileResult] = await tx.insert(profile).values({
      userId,
      system: true,
      name: DEFAULT_PROFILE_NAME,
    })
    const [ruleResult] = await tx.insert(rule).values({
      userId,
      profileId: profileResult.insertId,
      category: 'pokemon',
      name: DEFAULT_RULE_NAME,
    })
    await tx.insert(rulePokemon).values({ ruleId: ruleResult.insertId })
  })
}

/**
 * Wraps `seedProfileForUser` for the `session.create.after` hook: resolves
 * the database client lazily, and swallows any failure.
 *
 * Swallowing is deliberate and matches what the perms recompute next to it
 * already does. By the time this hook runs the session row exists, so a
 * throw would reject a sign-in that has already succeeded -- an operator
 * whose database hiccuped would see every login fail rather than a few maps
 * come up empty. The same reasoning an unreachable Discord bot gets.
 *
 * `getDb` is injectable so the failure path can be exercised without a
 * database.
 */
function createSeedProfileOnSignIn(getDb: () => any = getDrizzle) {
  return async function seed(userId: string): Promise<void> {
    try {
      await seedProfileForUser(getDb(), userId)
    } catch (e) {
      log.warn(TAGS.auth, 'profile seeding failed for', userId, e)
    }
  }
}

export {
  createSeedProfileOnSignIn,
  DEFAULT_PROFILE_NAME,
  DEFAULT_RULE_NAME,
  seedProfileForUser,
}
