const md5 = require('md5')
const bcrypt = require('bcrypt')
const { LocalUser } = require('../models/index')
const { alwaysEnabledPerms, localAuth } = require('./config')

class LocalAuthClient {
  async authenticate(username, password) {
    const result = {}
    await LocalUser.query()
      .findOne(`${localAuth.settings.usernameDbField}`, '=', username)
      .then(async (userExists) => {
        if (!userExists) {
          result.authentication = false
          result.message = 'User not found'
        } else {
          let passwordMatch
          if (localAuth.settings.passwordEncryption === "bcrypt") {
            passwordMatch = await bcrypt.compare(userExists[localAuth.settings.passwordDbField], password)
          } else if (localAuth.settings.passwordEncryption === "md5") {
            passwordMatch = userExists[localAuth.settings.passwordDbField] === md5(password)
          } else {
            passwordMatch = userExists[localAuth.settings.passwordDbField] === password
          }
          if (!passwordMatch) {
            result.authentication = false
            result.message = 'Incorrect password'
          } else {
            result.authentication = true
            result.message = 'Authentication successful'
            result.userData = userExists
          }
        }
      })
    return result
  }

  async getPerms(user) {
    const perms = {}
    Object.keys(localAuth.perms).map(perm => perms[perm] = false)
    perms.areaRestrictions = []

    if (localAuth.allowedUsers.includes(user[localAuth.settings.usernameDbField])) {
      Object.keys(perms).forEach((key) => perms[key] = true)
      console.log(`User ${user[localAuth.settings.usernameDbField]} in allowed users list, skipping permission check.`)
      return perms
    }

    const keys = Object.keys(localAuth.perms)
    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i]
      const configItem = localAuth.perms[key]
      if (configItem.enabled) {
        if (configItem.status.length === 0
          || alwaysEnabledPerms.includes(key)
          || configItem.status.includes(user[localAuth.settings.statusDbField])) {
          perms[key] = true
        }
      }
    }
    return perms
  }
}

module.exports = new LocalAuthClient()
