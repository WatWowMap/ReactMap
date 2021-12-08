/* eslint-disable no-console */
const { clearOtherSessions } = require('../sessionStore')

module.exports = async (client, member) => {
  try {
    await clearOtherSessions(member.id, '')
  } catch (e) {
    console.error(`Could not clear sessions for ${member.username}`)
  }
}
