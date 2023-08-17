const { Model, raw } = require('objection')
const getAreaSql = require('../services/functions/getAreaSql')
const fetchJson = require('../services/api/fetchJson')
const { filterRTree } = require('../services/functions/filterRTree')

class Device extends Model {
  static get tableName() {
    return 'device'
  }

  /**
   *
   * @param {import('types').Permissions} perms
   * @param {object} args
   * @param {import('types').DbContext} context
   * @returns {Promise<import('types').FullDevice[]>}
   */
  static async getAll(perms, args, context) {
    const { areaRestrictions } = perms
    const { onlyAreas } = args.filters
    const query = this.query()
    if (context.isMad) {
      query
        .join('trs_status', 'settings_device.device_id', 'trs_status.device_id')
        .join('settings_area', 'trs_status.area_id', 'settings_area.area_id')
        .select([
          'settings_device.name AS id',
          'settings_area.name AS instance_name',
          'mode AS type',
          raw('UNIX_TIMESTAMP(lastProtoDateTime)').as('updated'),
          raw('X(currentPos)').as('lat'),
          raw('Y(currentPos)').as('lon'),
          raw('true').as('isMad'),
        ])
    } else {
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
    }
    if (
      !getAreaSql(query, areaRestrictions, onlyAreas, context.isMad, 'device')
    ) {
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
      : await query.from(context.isMad ? 'settings_device' : 'device')
    return results.filter((device) => device.id && device.lat && device.lon)
  }
}

module.exports = Device
