// @ts-check
const { mergePerms } = require('../utils/mergePerms')

/** @typedef {'discord' | 'telegram'} Platform */
/**
 * @typedef {{ action: 'login' }
 *   | { action: 'refuse' }
 *   | { action: 'link', merge: import('@rm/types').FullUser | null }} LinkPlan
 */

/** @type {Record<Platform, Platform>} */
const OTHER = { discord: 'telegram', telegram: 'discord' }

/**
 * Decides what signing in with `platform` does for a visitor who is already
 * logged in as `current`. `other` is the row that already holds the incoming
 * platform id, if any.
 *
 * - `login`: nothing to link, the row already has that platform (the same
 *   account re-authenticating, or a different one, which switches accounts)
 * - `link`: attach the id to `current`, absorbing `other` when there is one
 * - `refuse`: `other` is a whole account of its own, merging it would lose it
 *
 * @param {import('@rm/types').FullUser | null | undefined} current
 * @param {import('@rm/types').FullUser | null | undefined} other
 * @param {Platform} platform
 * @returns {LinkPlan}
 */
function planLink(current, other, platform) {
  if (!current || current[`${platform}Id`]) return { action: 'login' }
  if (!other) return { action: 'link', merge: null }

  // a local account has a password a merge would throw away, and its strategy
  // may read discord or telegram after the user last signed in with one
  if (other.strategy === 'local' || other.password) return { action: 'refuse' }

  const otherField = `${OTHER[platform]}Id`
  if (
    other[otherField] &&
    current[otherField] &&
    other[otherField] !== current[otherField]
  ) {
    return { action: 'refuse' }
  }
  return { action: 'link', merge: other }
}

/**
 * The session user after linking: still the logged in row, with the linked
 * ids and both platforms' perms
 *
 * @template {{ perms: import('@rm/types').Permissions, username?: string }} T
 * @param {import('@rm/types').User} reqUser
 * @param {T} platformUser
 * @param {{ discordId?: string, telegramId?: string, webhookStrategy?: string }} linked
 */
function sessionUser(reqUser, platformUser, linked) {
  return {
    ...platformUser,
    ...reqUser,
    ...linked,
    username: reqUser.username || platformUser.username,
    perms: mergePerms(reqUser.perms, platformUser.perms),
  }
}

/**
 * Moves the gym badges of `fromId` to `toId`, keeping the higher badge where
 * both have one for the same gym
 *
 * @param {import('@rm/types').Models['Badge']} Badge
 * @param {number} fromId
 * @param {number} toId
 * @param {import('objection').Transaction} trx
 */
async function moveBadges(Badge, fromId, toId, trx) {
  const [mine, theirs] = await Promise.all([
    Badge.query(trx).where('userId', toId),
    Badge.query(trx).where('userId', fromId),
  ])
  const byGym = new Map(mine.map((badge) => [badge.gymId, badge]))
  await Promise.all(
    theirs.map(async (badge) => {
      const own = byGym.get(badge.gymId)
      if (!own) {
        return Badge.query(trx).update({ userId: toId }).where('id', badge.id)
      }
      if (badge.badge > own.badge) {
        await Badge.query(trx)
          .update({ badge: badge.badge })
          .where('id', own.id)
      }
      return Badge.query(trx).delete().where('id', badge.id)
    }),
  )
}

/**
 * Links a Discord or Telegram account to the row of the user who is signed in.
 * A row that only existed for that account is merged in and deleted.
 *
 * @param {Pick<import('@rm/types').Models, 'User' | 'Badge' | 'Backup' | 'NestSubmission' | 'Session'>} models
 * @param {{
 *   userId: number,
 *   platform: Platform,
 *   externalId: string,
 *   perms: import('@rm/types').Permissions,
 *   sessionId?: string,
 * }} options
 * @returns {Promise<LinkPlan & { linked?: { discordId?: string, telegramId?: string, webhookStrategy?: string } }>}
 */
async function linkAccount(
  { User, Badge, Backup, NestSubmission, Session },
  { userId, platform, externalId, perms, sessionId },
) {
  const field = `${platform}Id`
  const otherPlatform = OTHER[platform]
  const otherField = `${otherPlatform}Id`

  const [current, other] = await Promise.all([
    User.query().findOne({ id: userId }),
    User.query().findOne({ [field]: externalId }),
  ])
  const plan = planLink(current, other, platform)
  if (plan.action !== 'link') return plan

  const { merge } = plan
  const update = {
    [field]: externalId,
    [`${platform}Perms`]: JSON.stringify(perms),
    // only a local sign-in reads this, Discord and Telegram sign-ins always
    // alert the account they used; keep a local user's alerts where they were
    webhookStrategy:
      current.webhookStrategy ||
      (current[otherField] ? otherPlatform : platform),
  }
  if (merge) {
    if (!current.data && merge.data) update.data = merge.data
    if (!current[otherField] && merge[otherField]) {
      update[otherField] = merge[otherField]
      update[`${otherPlatform}Perms`] = merge[`${otherPlatform}Perms`]
    }
  }

  await User.transaction(async (trx) => {
    if (merge) {
      await moveBadges(Badge, merge.id, current.id, trx)
      await Backup.query(trx)
        .update({ userId: current.id })
        .where('userId', merge.id)
      await NestSubmission.query(trx)
        .update({ user_id: current.id })
        .where('user_id', merge.id)
      await User.query(trx).delete().where('id', merge.id)
    }
    await User.query(trx).update(update).where('id', current.id)
  })

  if (merge) {
    // sessions of the deleted row point at a user that no longer exists
    await Session.clearOtherSessions(merge.id, sessionId).catch(() => {})
  }

  return {
    ...plan,
    linked: {
      discordId: update.discordId ?? current.discordId,
      telegramId: update.telegramId ?? current.telegramId,
      webhookStrategy: update.webhookStrategy,
    },
  }
}

module.exports = { linkAccount, planLink, sessionUser }
