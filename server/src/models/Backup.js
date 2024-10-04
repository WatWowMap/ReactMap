// @ts-check
/* eslint-disable no-bitwise */
const { Model } = require('objection')
const config = require('@rm/config')

const bytes = (s) => ~-encodeURI(s).split(/%..|./).length

const jsonSize = (s) => bytes(JSON.stringify(s))

class Backup extends Model {
  static get tableName() {
    return 'backups'
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
          from: `${'backups'}.userId`,
          to: `${'users'}.id`,
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
    return this.query().findById(id).where('userId', userId)
  }

  /**
   *
   * @param {number} userId
   * @returns {Promise<import('@rm/types').FullBackup[]>}
   */
  static async getAll(userId) {
    const records = await this.query()
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
    const count = await this.query().count().where('userId', userId).first()

    if (
      count['count(*)'] < config.getSafe('database.settings.userBackupLimits')
    ) {
      // @ts-ignore
      await this.query().insert({
        // @ts-ignore
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
      this.query()
        // @ts-ignore
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
    return this.query().deleteById(id).where('userId', userId)
  }
}

module.exports = { Backup }
