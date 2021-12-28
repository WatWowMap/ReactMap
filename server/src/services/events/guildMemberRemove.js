/* eslint-disable no-console */
const { clearOtherSessions } = require('../sessionStore')
const { User } = require('../../models/index')

module.exports = async (client, member) => {
  try {
    await clearOtherSessions(member.id, '', client.user.username)
    await User.clearPerms(member.id, 'discord', client.user.username)
  } catch (e) {
    console.error(`Could not clear sessions for ${member.username}`)
  }
}
