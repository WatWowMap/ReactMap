// @ts-check
const { log, HELPERS } = require('@rm/logger')
const state = require('../state')

/**
 *
 * @param {import('discord.js').Client} client
 * @param {import('discord.js').User} member
 */
module.exports = async (client, member) => {
  try {
    await state.db.models.Session.clearDiscordSessions(
      member.id,
      client.user.username,
    )
    await state.db.models.User.clearPerms(
      member.id,
      'discord',
      client.user.username,
    )
  } catch (e) {
    log.error(
      HELPERS.session,
      `Could not clear sessions for ${member.username}`,
    )
  }
}
