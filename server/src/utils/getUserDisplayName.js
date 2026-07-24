// @ts-check

/**
 * @typedef {{
 *   username?: string,
 *   first_name?: string,
 *   last_name?: string,
 *   name?: { givenName?: string, familyName?: string },
 *   telegramId?: string,
 *   discordId?: string,
 *   id?: string | number,
 * }} DisplayUser
 */

/**
 * @param {DisplayUser} user
 * @returns {string}
 */
function getUserDisplayName(user) {
  const firstName = (user.first_name || user.name?.givenName || '').trim()
  const lastName = (user.last_name || user.name?.familyName || '').trim()
  const telegramName = [firstName, lastName].filter(Boolean).join(' ')
  const id = user.telegramId || user.discordId || user.id

  return user.username || telegramName || (id ? String(id) : 'a visitor')
}

module.exports = { getUserDisplayName }
