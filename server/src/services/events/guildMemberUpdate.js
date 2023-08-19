// @ts-check
const config = require('@rm/config')

const { log, HELPERS } = require('@rm/logger')
const { Db } = require('../initialization')

/**
 *
 * @param {import('discord.js').Client} client
 * @param {import('discord.js').GuildMember} oldPresence
 * @param {import('discord.js').GuildMember} newPresence
 */
module.exports = async (client, oldPresence, newPresence) => {
  const rolesBefore = oldPresence.roles.cache.map((x) => x.id)
  const rolesAfter = newPresence.roles.cache.map((x) => x.id)
  const perms = [
    ...new Set(
      Object.values(config.getSafe('authentication.perms')).flatMap(
        (x) => x.roles,
      ),
    ),
  ]
  const roleDiff = rolesBefore
    .filter((x) => !rolesAfter.includes(x))
    .concat(rolesAfter.filter((x) => !rolesBefore.includes(x)))
  try {
    if (perms.includes(roleDiff[0])) {
      await Db.models.Session.clearDiscordSessions(
        oldPresence.user.id,
        client.user.username,
      )
      await Db.models.User.clearPerms(
        oldPresence.user.id,
        'discord',
        client.user.username,
      )
    }
  } catch (e) {
    log.error(
      HELPERS.session,
      `Could not clear sessions for ${oldPresence.user.username}`,
    )
  }
}
