// @ts-check
/* eslint-disable no-bitwise */
const { Model } = require('objection')
const config = require('@rm/config')

const bytes = (s) => ~-encodeURI(s).split(/%..|./).length

const jsonSize = (s) => bytes(JSON.stringify(s))

/** Name of the hidden row that holds a user's automatically synced settings */
const SYNC_NAME = '__autosync'

class Backup extends Model {
  static get tableName() {
    return config.getSafe('database.settings.backupTableName')
  }

  // the sync row sets its own updatedAt (a revision in ms), backups use seconds
  $beforeInsert() {
    this.createdAt = Math.floor(Date.now() / 1000)
    if (!this.updatedAt) this.updatedAt = Math.floor(Date.now() / 1000)
  }

  $beforeUpdate() {
    if (!this.updatedAt) this.updatedAt = Math.floor(Date.now() / 1000)
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
      .whereNot('name', SYNC_NAME)
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
    if (backup.name === SYNC_NAME) throw new Error('Reserved name')
    const count = await this.query()
      .count()
      .where('userId', userId)
      .whereNot('name', SYNC_NAME)
      .first()
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
    if (backup.name === SYNC_NAME) throw new Error('Reserved name')
    return (
      this.query()
        // @ts-ignore
        .update({ name: backup.name, data: JSON.stringify(backup.data) })
        .where('id', +backup.id)
        .where('userId', userId)
        .whereNot('name', SYNC_NAME)
    )
  }

  /**
   * The user's automatically synced settings, hidden from the backups list
   * @param {number} userId
   * @param {boolean} [withData]
   * @returns {Promise<{ rev: number, data?: object } | null>}
   */
  static async getSync(userId, withData = false) {
    const row = await this.query()
      .select(withData ? ['updatedAt', 'data'] : ['updatedAt'])
      .where({ userId, name: SYNC_NAME })
      .orderBy('id')
      .first()
    if (!row) return null
    if (!withData) return { rev: +row.updatedAt }
    return {
      rev: +row.updatedAt,
      data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data,
    }
  }

  /**
   * Saves the synced settings, unless another device saved since `baseRev`
   * @param {object} data
   * @param {number} baseRev the revision the client last pulled or pushed
   * @param {number} userId
   * @returns {Promise<{ rev: number, conflict: boolean }>}
   */
  static async setSync(data, baseRev, userId) {
    if (
      jsonSize(data) > config.getSafe('database.settings.userBackupSizeLimit')
    )
      throw new Error('Data too large')
    const existing = await this.getSync(userId)
    if (existing && existing.rev !== baseRev) {
      return { rev: existing.rev, conflict: true }
    }
    const rev = Math.max(Date.now(), (existing?.rev || 0) + 1)
    const conflict = async () => ({
      rev: (await this.getSync(userId))?.rev || 0,
      conflict: true,
    })
    if (existing) {
      // only saved when nobody saved in between, checked in the same statement
      const updated = await this.query()
        // @ts-ignore
        .patch({ data: JSON.stringify(data), updatedAt: rev })
        .where({ userId, name: SYNC_NAME, updatedAt: existing.rev })
      if (!updated) return conflict()
    } else {
      // @ts-ignore
      const inserted = await this.query().insert({
        // @ts-ignore
        userId,
        name: SYNC_NAME,
        data: JSON.stringify(data),
        updatedAt: rev,
      })
      // two first saves at the same time both insert; the first row stays
      const rows = await this.query()
        .select(['id'])
        .where({ userId, name: SYNC_NAME })
        .orderBy('id')
      if (rows.length > 1) {
        await this.query()
          .delete()
          .whereIn(
            'id',
            rows.slice(1).map((row) => row.id),
          )
      }
      // the other save's row stayed (also when it already cleaned up ours)
      // @ts-ignore
      if (rows[0]?.id !== inserted.id) return conflict()
    }
    return { rev, conflict: false }
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
