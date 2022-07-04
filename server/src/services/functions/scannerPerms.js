const { scanner } = require('../config')

module.exports = function scannerPerms(roles, provider) {
  const perms = []
  roles.forEach((role) => {
    Object.keys(scanner).forEach((mode) => {
      if (
        scanner[mode]?.enabled &&
        scanner[mode][provider] &&
        (scanner[mode][provider].includes(role) ||
          !scanner[mode][provider].length)
      ) {
        perms.push(mode)
      }
    })
  })
  return [...new Set(perms)]
}
