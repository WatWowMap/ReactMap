/* eslint-disable no-bitwise */
const { Model } = require('objection')
const {
  database: {
    settings: {
      userBackupLimits,
      userBackupSizeLimit,
      userTableName,
      backupTableName,
    },
  },
} = require('../services/config')

const bytes = (s) => ~-encodeURI(s).split(/%..|./).length

const jsonSize = (s) => bytes(JSON.stringify(s))

class Backup extends Model {
  /** @returns {string} */
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
    const { Db } = require('../services/initialization')
    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: Db.models.User,
        join: {
          from: `${backupTableName}.userId`,
          to: `${userTableName}.id`,
        },
      },
    }
  }

  /**
   *
   * @param {number} id
   * @param {number} userId
   * @returns
   */
  static async getOne(id, userId) {
    return this.query().findById(id).where('userId', userId)
  }

  /**
   *
   * @param {number} userId
   * @returns
   */
  static async getAll(userId) {
    return this.query()
      .select(['id', 'name', 'createdAt', 'updatedAt'])
      .where('userId', userId)
      .whereNotNull('data')
  }

  /**
   *
   * @param {{ name: string, data: object }} backup
   * @param {number} userId
   * @returns
   */
  static async create(backup, userId) {
    if (jsonSize(backup.data) > userBackupSizeLimit)
      throw new Error('Data too large')
    const count = await this.query().count().where('userId', userId).first()
    if (count['count(*)'] < userBackupLimits) {
      return this.query().insert({
        userId,
        name: backup.name,
        data: JSON.stringify(backup.data),
      })
    }
  }

  /**
   *
   * @param {{ name: string, data: object, id: number | string}} backup
   * @param {number} userId
   * @returns
   */
  static async update(backup, userId) {
    if (jsonSize(backup.data) > userBackupSizeLimit)
      throw new Error('Data too large')
    return this.query()
      .update({ name: backup.name, data: JSON.stringify(backup.data) })
      .where('id', +backup.id)
      .where('userId', userId)
  }

  /**
   *
   * @param {number} id
   * @param {number} userId
   * @returns
   */
  static async delete(id, userId) {
    return this.query().deleteById(id).where('userId', userId)
  }
}

module.exports = Backup
