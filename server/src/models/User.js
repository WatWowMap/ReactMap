/* eslint-disable no-console */
const { Model } = require('objection')
const { database: { settings: { userTableName } } } = require('../services/config')

module.exports = class User extends Model {
  static get tableName() {
    return userTableName
  }

  static async clearPerms(userId, strategy, botName) {
    await this.query()
      .update({ [`${strategy}Perms`]: null })
      .where({ [`${strategy}Id`]: userId })
      .then(() => console.log(`[${botName}] Cleared ${strategy} perms for user ${userId}`))
  }
}
