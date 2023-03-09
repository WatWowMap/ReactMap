/* eslint-disable no-console */
const { Db } = require('../initialization')

module.exports = async (client, member) => {
  try {
    await Db.models.Session.clearDiscordSessions(
      member.id,
      client.user.username,
    )
    await Db.models.User.clearPerms(member.id, 'discord', client.user.username)
  } catch (e) {
    console.error(`[SESSION] Could not clear sessions for ${member.username}`)
  }
}
