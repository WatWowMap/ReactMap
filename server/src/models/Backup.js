const { Model } = require('objection')
const {
  database: {
    settings: { userBackupLimits, userTableName, backupTableName },
  },
} = require('../services/config')

module.exports = class Backup extends Model {
  static get tableName() {
    return backupTableName
  }

  $beforeInsert() {
    this.createdAt = Math.floor(Date.now() / 1000)
    this.updatedAt = Math.floor(Date.now() / 1000)
  }

  $beforeUpdate() {
    this.updatedAt = Math.floor(Date.now() / 1000)
  }

  static get relationMappings() {
    // eslint-disable-next-line global-require
    const User = require('./User')
    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: `${backupTableName}.userId`,
          to: `${userTableName}.id`,
        },
      },
    }
  }

  static async getOne(id) {
    return this.query().findById(id)
  }

  static async getAll(userId) {
    return this.query()
      .select(['id', 'name', 'createdAt', 'updatedAt'])
      .where('userId', userId)
      .whereNotNull('data')
  }

  static async create({ userId, name, data }) {
    const count = await this.query().count().where('userId', userId).first()
    if (count['count(*)'] < userBackupLimits) {
      return this.query().insert({ userId, name, data })
    }
  }

  static async update({ id, name, data }) {
    return this.query().patchAndFetchById(id, { name, data })
  }

  static async delete(id) {
    return this.query().deleteById(id)
  }
}
