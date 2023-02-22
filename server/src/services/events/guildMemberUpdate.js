/* eslint-disable no-console */
/* global BigInt */
const { Db } = require('../initialization')

module.exports = async (client, oldPresence, newPresence) => {
  const rolesBefore = oldPresence.roles.cache
    .filter((x) => BigInt(x.id).toString())
    .keyArray()
  const rolesAfter = newPresence.roles.cache
    .filter((x) => BigInt(x.id).toString())
    .keyArray()
  const perms = [
    ...new Set(
      Object.values(client.config.perms)
        .map((x) => x.roles)
        .flat(),
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
    console.error(
      `Could not clear sessions for ${oldPresence.user.username}#${oldPresence.user.discriminator}`,
    )
  }
}
