/* eslint-disable no-bitwise */
const { Model } = require('objection')
const config = require('config')

const bytes = (s) => ~-encodeURI(s).split(/%..|./).length

const jsonSize = (s) => bytes(JSON.stringify(s))

class Backup extends Model {
  static get tableName() {
    return config.getSafe('database.settings.backupTableName')
  }

  $beforeInsert() {
    this.createdAt = Math.floor(Date.now() / 1000)
    this.updatedAt = Math.floor(Date.now() / 1000)
  }

  $beforeUpdate() {
    this.updatedAt = Math.floor(Date.now() / 1000)
  }

  get data() {
    return typeof this.data === 'string' ? JSON.parse(this.data) : this.data
  }

  static get relationMappings() {
    const { Db } = require('../services/initialization')
    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: Db.models.User,
        join: {
          from: `${config.getSafe('database.settings.backupTableName')}.userId`,
          to: `${config.getSafe('database.settings.userTableName')}.id`,
        },
      },
    }
  }

  /**
   *
   * @param {number} id
   * @param {number} userId
   * @returns {Promise<import('types/models').FullBackup>}
   */
  static async getOne(id, userId) {
    return this.query().findById(id).where('userId', userId)
  }

  /**
   *
   * @param {number} userId
   * @returns {Promise<import('types/models').FullBackup[]>}
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
    if (
      jsonSize(backup.data) >
      config.getSafe('database.settings.userBackupSizeLimit')
    )
      throw new Error('Data too large')
    const count = await this.query().count().where('userId', userId).first()
    if (
      count['count(*)'] < config.getSafe('database.settings.userBackupLimits')
    ) {
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
    if (
      jsonSize(backup.data) >
      config.getSafe('database.settings.userBackupLimits')
    )
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
