/* eslint-disable no-console */
const { clearDiscordSessions } = require('../sessionStore')
const { User } = require('../../models/index')

module.exports = async (client, member) => {
  try {
    await clearDiscordSessions(member.id, client.user.username)
    await User.clearPerms(member.id, 'discord', client.user.username)
  } catch (e) {
    console.error(`[SESSION] Could not clear sessions for ${member.username}`)
  }
}
