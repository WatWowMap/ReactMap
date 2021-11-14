const areas = require('../areas')
const config = require('../config')

module.exports = function areaPerms(roles, provider) {
  let perms = []
  if (Object.keys(areas.names).length) {
    roles.forEach(group => {
      config[provider].areaRestrictions.forEach(rule => {
        if (rule.roles.includes(group)) {
          if (rule.areas.length) {
            rule.areas.forEach(areaName => {
              if (areas.names.includes(areaName)) {
                perms.push(areaName)
              }
            })
          }
        }
      })
    })
  }
  if (perms.length) {
    perms = [...new Set(perms)]
  }
  return perms
}
