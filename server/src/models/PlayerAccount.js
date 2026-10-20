// @ts-check
const { Model } = require('objection')
const config = require('@rm/config')

/**
 * @typedef {{ playerId: string, label: string, active: boolean }} PlayerAccountEntry
 */

/** The game accounts a user saved for personal shinies, in the order saved */
class PlayerAccount extends Model {
  static get tableName() {
    return config.getSafe('database.settings.playerAccountTableName')
  }

  $beforeInsert() {
    this.createdAt = Math.floor(Date.now() / 1000)
    this.updatedAt = Math.floor(Date.now() / 1000)
  }

  $beforeUpdate() {
    this.updatedAt = Math.floor(Date.now() / 1000)
  }

  /**
   * @param {number} userId
   * @returns {Promise<PlayerAccountEntry[]>}
   */
  static async getAll(userId) {
    const rows = await this.query()
      .select(['playerId', 'label', 'active'])
      .where('userId', userId)
      .orderBy('id')
    return rows.map(({ playerId, label, active }) => ({
      playerId,
      label,
      active: !!active,
    }))
  }

  /**
   * The accounts the map marks shinies for: the first `max` saved, unless
   * paused
   * @param {number} userId
   * @param {number} max
   * @returns {Promise<import('../utils/personalShiny').PersonalShinyPlayer[]>}
   */
  static async getActive(userId, max) {
    return (await this.getAll(userId))
      .slice(0, max)
      .filter((account) => account.active)
      .map(({ playerId, label }) => ({ playerId, label }))
  }

  /**
   * Replaces the user's accounts with the given ones: missing ones are
   * removed, known ones updated and new ones added after them
   * @param {number} userId
   * @param {PlayerAccountEntry[]} accounts
   * @returns {Promise<PlayerAccountEntry[]>}
   */
  static async replace(userId, accounts) {
    await this.transaction(async (trx) => {
      const current = await this.query(trx).where('userId', userId).forUpdate()
      const known = new Map(current.map((row) => [row.playerId, row]))
      const kept = new Set(accounts.map((account) => account.playerId))
      const removed = current
        .filter((row) => !kept.has(row.playerId))
        .map((row) => row.id)
      if (removed.length) {
        await this.query(trx).delete().whereIn('id', removed)
      }
      // one at a time, so new accounts get their ids in the order saved
      for (let i = 0; i < accounts.length; i += 1) {
        const { playerId, label, active } = accounts[i]
        const row = known.get(playerId)
        if (!row) {
          // eslint-disable-next-line no-await-in-loop
          await this.query(trx)
            // @ts-ignore
            .insert({ userId, playerId, label, active })
        } else if (row.label !== label || !!row.active !== active) {
          // eslint-disable-next-line no-await-in-loop
          await this.query(trx)
            // @ts-ignore
            .patch({ label, active })
            .where('id', row.id)
        }
      }
    })
    return this.getAll(userId)
  }
}

module.exports = { PlayerAccount }
