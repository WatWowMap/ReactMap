const { scanner } = require('../config')

module.exports = function scannerPerms(roles, provider) {
  let perms = []
  if (Object.keys(scanner).length) {
    roles.forEach((role) => {
      Object.keys(scanner).forEach((mode) => {
        if (scanner[mode][provider]?.includes(role)) {
          perms.push(mode)
        }
      })
    })
  }
  if (perms.length) {
    perms = [...new Set(perms)]
  }
  return perms
}
