const md5 = require('md5')
const bcrypt = require('bcrypt')
const { CustomAuth } = require('../models/index')
const { alwaysEnabledPerms, customAuth } = require('./config')
const areas = require('./areas.js')

class CustomAuthClient {
  async authenticate(username, password) {
    const result = {}
    await CustomAuth.query()
      .findOne(`${customAuth.settings.usernameDbField}`, '=', username)
      .then(async (userExists) => {
        if (!userExists) {
          result.authentication = false
          result.message = 'User not found'
        } else {
          let passwordMatch
          if (customAuth.settings.passwordEncryption === "bcrypt") {
            passwordMatch = await bcrypt.compare(userExists[customAuth.settings.passwordDbField], password)
          } else if (customAuth.settings.passwordEncryption === "md5") {
            passwordMatch = userExists[customAuth.settings.passwordDbField] === md5(password)
          } else {
            passwordMatch = userExists[customAuth.settings.passwordDbField] === password
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
    Object.keys(customAuth.perms).map(perm => perms[perm] = false)
    perms.areaRestrictions = []

    if (customAuth.allowedUsers.includes(user[customAuth.settings.usernameDbField])) {
      Object.keys(perms).forEach((key) => perms[key] = true)
      perms.areaRestrictions = []
      console.log(`User ${user[customAuth.settings.usernameDbField]} in allowed users list, skipping permission check.`)
      return perms
    }

    // Roles & Perms
    const keys = Object.keys(customAuth.perms)
    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i]
      const configItem = customAuth.perms[key]
      if (configItem.enabled) {
        if (configItem.status.length === 0
          || alwaysEnabledPerms.includes(key)
          || configItem.status.includes(user[customAuth.settings.statusDbField])) {
          perms[key] = true
        }
      }
    }
    // Area Restriction Rules
    if (Object.keys(areas.names).length > 0) {
      customAuth.areaRestrictions.forEach(rule => {
        if (rule.status.includes(user[customAuth.settings.statusDbField])) {
          if (rule.areas.length > 0) {
            rule.areas.forEach(areaName => {
              if (areas.names.includes(areaName)) {
                perms.areaRestrictions.push(areaName)
              }
            })
          }
        }
      })
    }
    if (perms.areaRestrictions.length > 0) {
      perms.areaRestrictions = [...new Set(perms.areaRestrictions)]
    }
    return perms
  }
}

module.exports = new CustomAuthClient()
