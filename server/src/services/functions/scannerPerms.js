const { scanner } = require('../config')

module.exports = function scannerPerms(roles, provider) {
  let perms = []
  roles.forEach((role) => {
    Object.keys(scanner).forEach((mode) => {
      if (
        scanner[mode][provider] &&
        (scanner[mode][provider].includes(role) ||
          !scanner[mode][provider].length)
      ) {
        perms.push(mode)
      }
    })
  })
  if (perms.length) {
    perms = [...new Set(perms)]
  }
  return perms
}
