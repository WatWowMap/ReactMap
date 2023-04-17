const { Db } = require('../initialization')
const { log, HELPERS } = require('../logger')

module.exports = async (client, member) => {
  try {
    await Db.models.Session.clearDiscordSessions(
      member.id,
      client.user.username,
    )
    await Db.models.User.clearPerms(member.id, 'discord', client.user.username)
  } catch (e) {
    log.error(
      HELPERS.session,
      `Could not clear sessions for ${member.username}`,
    )
  }
}
