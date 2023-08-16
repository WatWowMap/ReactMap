// @ts-check
const config = require('config')

/** @param {string[]} roles @returns */
function areaPerms(roles) {
  const areaRestrictions = config.getSafe('authentication.areaRestrictions')
  const areas = config.getSafe('areas')

  const perms = []
  for (let i = 0; i < roles.length; i += 1) {
    for (let j = 0; j < areaRestrictions.length; j += 1) {
      if (areaRestrictions[j].roles.includes(roles[i])) {
        if (areaRestrictions[j].areas.length) {
          for (let k = 0; k < areaRestrictions[j].areas.length; k += 1) {
            if (areas.names.has(areaRestrictions[j].areas[k])) {
              perms.push(areaRestrictions[j].areas[k])
            } else if (areas.withoutParents[areaRestrictions[j].areas[k]]) {
              perms.push(...areas.withoutParents[areaRestrictions[j].areas[k]])
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

module.exports = areaPerms
