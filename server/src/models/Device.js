// @ts-check
const { Model, raw } = require('objection')
const { getAreaSql } = require('../utils/getAreaSql')
const { fetchJson } = require('../utils/fetchJson')
const { filterRTree } = require('../utils/filterRTree')

class Device extends Model {
  static get tableName() {
    return 'device'
  }

  /**
   *
   * @param {import("@rm/types").Permissions} perms
   * @param {object} args
   * @param {import("@rm/types").DbContext} context
   * @returns {Promise<import("@rm/types").FullDevice[]>}
   */
  static async getAll(perms, args, context) {
    const { areaRestrictions } = perms
    const { onlyAreas } = args.filters
    const query = this.query()
    query
      .leftJoin('instance', 'device.instance_name', 'instance.name')
      .select(
        'uuid AS id',
        'last_seen AS updated',
        'last_lat AS lat',
        'last_lon AS lon',
        'type',
        'instance_name',
        raw('json_extract(data, "$.area")').as('route'),
        raw('json_extract(data, "$.radius")').as('radius'),
      )
    if (!getAreaSql(query, areaRestrictions, onlyAreas, 'device')) {
      return []
    }
    const results = context.mem
      ? await fetchJson(`${context.mem}/api/devices/all`, {
          method: 'GET',
          headers: {
            'X-Golbat-Secret': context.secret || undefined,
          },
        }).then((res) =>
          Object.entries(res.devices)
            .map(([id, device]) => ({
              id,
              lat: device.latitude,
              lon: device.longitude,
              updated: device.last_update,
              type: device.scan_context,
            }))
            .filter((device) =>
              filterRTree(device, areaRestrictions, onlyAreas),
            ),
        )
      : await query.from('device')
    // @ts-ignore
    return results.filter((device) => device.id && device.lat && device.lon)
  }
}

module.exports = { Device }
