const { Db } = require('../initialization')
const { authentication } = require('../config')
const { log, HELPERS } = require('../logger')

module.exports = async (client, oldPresence, newPresence) => {
  const rolesBefore = oldPresence._roles
  const rolesAfter = newPresence._roles
  const perms = [
    ...new Set(Object.values(authentication.perms).flatMap((x) => x.roles)),
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
      `Could not clear sessions for ${oldPresence.user.username}#${oldPresence.user.discriminator}`,
    )
  }
}
