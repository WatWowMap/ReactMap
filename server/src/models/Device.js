const { Model, raw } = require('objection')
const getAreaSql = require('../services/functions/getAreaSql')

module.exports = class Device extends Model {
  static get tableName() {
    return 'device'
  }

  static async getAll(perms, _args, settings) {
    const { areaRestrictions } = perms
    const query = this.query()
    if (settings.isMad) {
      query.join('trs_status', 'settings_device.device_id', 'trs_status.device_id')
        .join('settings_area', 'trs_status.area_id', 'settings_area.area_id')
        .select([
          'settings_device.name AS id',
          'settings_area.name AS instance_name',
          'mode AS type',
          raw('UNIX_TIMESTAMP(lastProtoDateTime)')
            .as('last_seen'),
          raw('X(currentPos)')
            .as('last_lat'),
          raw('Y(currentPos)')
            .as('last_lon'),
          raw(true)
            .as('isMad'),
        ])
    } else {
      query.join('instance', 'device.instance_name', 'instance.name')
        .select(
          'uuid AS id',
          'last_seen',
          'last_lat',
          'last_lon',
          'type',
          'instance_name',
          raw('json_extract(data, "$.area")')
            .as('route'),
          raw('json_extract(data, "$.radius")')
            .as('radius'),
        )
    }
    if (areaRestrictions.length) {
      getAreaSql(query, areaRestrictions, settings.isMad, 'device')
    }
    return query.from(settings.isMad ? 'settings_device' : 'device')
  }
}
