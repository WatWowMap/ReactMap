const { Model, raw } = require('objection')
const dbSelection = require('../services/functions/dbSelection')
const getAreaSql = require('../services/functions/getAreaSql')

class Device extends Model {
  static get tableName() {
    return dbSelection('device') === 'mad' ? 'settings_device' : 'device'
  }

  static get idColumn() {
    return dbSelection('device') === 'mad' ? 'device_id' : 'uuid'
  }

  static async getAllDevices(perms, isMad) {
    const { areaRestrictions } = perms
    const query = this.query()
    if (isMad) {
      query.join('trs_status', 'settings_device.device_id', 'trs_status.device_id')
        .join('settings_area', 'trs_status.area_id', 'settings_area.area_id')
        .select([
          'settings_device.name AS uuid',
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
        .select('uuid', 'last_seen', 'last_lat', 'last_lon', 'type', 'instance_name',
          raw('json_extract(data, "$.area")')
            .as('route'))
    }
    if (areaRestrictions.length) {
      getAreaSql(query, areaRestrictions, isMad, 'device')
    }
    return query
  }
}

module.exports = Device
