const { names } = require('../areas')
const {
  authentication: { areaRestrictions },
} = require('../config')

module.exports = function areaPerms(roles) {
  const perms = []
  for (let i = 0; i < roles.length; i += 1) {
    for (let j = 0; j < areaRestrictions.length; j += 1) {
      if (areaRestrictions[j].roles.includes(roles[i])) {
        if (areaRestrictions[j].areas.length) {
          for (let k = 0; k < areaRestrictions[j].areas.length; k += 1) {
            if (names.includes(areaRestrictions[j].areas[k])) {
              perms.push(areaRestrictions[j].areas[k])
            }
          }
        } else {
          return []
        }
      }
    }
  }
  return [...new Set(perms)]
}
