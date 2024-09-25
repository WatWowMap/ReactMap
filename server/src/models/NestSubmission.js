// @ts-check
const { Model } = require('objection')

const { log, TAGS } = require('@rm/logger')

class NestSubmission extends Model {
  static get tableName() {
    return 'nest_submissions'
  }

  static get idColumn() {
    return 'nest_id'
  }

  static get relationMappings() {
    // eslint-disable-next-line global-require
    const { state } = require('../services/state')
    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: state.db.models.User,
        join: {
          from: `nest_submissions.user_id`,
          to: `${'users'}.id`,
        },
      },
    }
  }

  /**
   *
   * @param {number} [userId]
   * @returns {Promise<import('@rm/types').FullNestSubmission[]>}
   */
  static async getAllByUser(userId) {
    return this.query().where('user_id', userId)
  }

  /**
   *
   * @param {number[]} nestIds
   * @returns {Promise<import('@rm/types').FullNestSubmission[]>}
   */
  static async getAllByIds(nestIds) {
    return this.query().whereIn('nest_id', nestIds)
  }

  /**
   *
   * @param {string} name
   * @returns {Promise<import('@rm/types').FullNestSubmission[]>}
   */
  static async search(name) {
    return this.query().where('name', 'like', `%${name}%`)
  }

  /**
   *
   * @param {{ name: string, nest_id: number }} nestInfo
   * @param {{ submitted_by: string, user_id: number }} userInfo
   * @returns
   */
  static async create(nestInfo, userInfo) {
    if (
      nestInfo.name &&
      nestInfo.nest_id &&
      userInfo.submitted_by &&
      userInfo.user_id
    ) {
      /** @type {import('@rm/types').FullNestSubmission} */
      const nest = await this.query().findById(nestInfo.nest_id)
      if (nest) {
        await nest.$query().patch({ ...nestInfo, ...userInfo })
        log.info(
          TAGS.nests,
          `Nest name updated for ${nestInfo.nest_id} from ${nest.name} to ${nestInfo.name} by ${userInfo.submitted_by} (ID: ${userInfo.user_id})`,
        )
        return true
      }
      await this.query().insert({ ...nestInfo, ...userInfo })
      log.info(
        TAGS.nests,
        `Nest name submitted for ${nestInfo.nest_id} as ${nestInfo.name} by ${userInfo.submitted_by} (ID: ${userInfo.user_id})`,
      )
      return true
    }
    log.warn(
      TAGS.nests,
      `Nest name submission failed for ${nestInfo.nest_id} by ${userInfo.submitted_by} (ID: ${userInfo.user_id})`,
    )
    return false
  }
}

module.exports = { NestSubmission }
