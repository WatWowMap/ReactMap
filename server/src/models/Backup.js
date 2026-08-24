// @ts-check
/* eslint-disable no-bitwise */
const { Model } = require('objection')
const config = require('@rm/config')

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

  static get relationMappings() {
    const { state } = require('../services/state')
    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: state.db.models.User,
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
   * @returns {Promise<import('@rm/types').FullBackup>}
   */
  static async getOne(id, userId) {
    return Backup.query().findById(id).where('userId', userId)
  }

  /**
   *
   * @param {number} userId
   * @returns {Promise<import('@rm/types').FullBackup[]>}
   */
  static async getAll(userId) {
    const records = await Backup.query()
      .select(['id', 'name', 'createdAt', 'updatedAt'])
      .where({ userId })
      .whereNotNull('data')
    return records
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
    const count = await Backup.query().count().where('userId', userId).first()
    if (
      count['count(*)'] < config.getSafe('database.settings.userBackupLimits')
    ) {
      // @ts-expect-error
      await Backup.query().insert({
        // @ts-expect-error
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
      config.getSafe('database.settings.userBackupSizeLimit')
    )
      throw new Error('Data too large')
    return (
      Backup.query()
        // @ts-expect-error
        .update({ name: backup.name, data: JSON.stringify(backup.data) })
        .where('id', +backup.id)
        .where('userId', userId)
    )
  }

  /**
   *
   * @param {number} id
   * @param {number} userId
   * @returns
   */
  static async delete(id, userId) {
    return Backup.query().deleteById(id).where('userId', userId)
  }
}

module.exports = { Backup }
