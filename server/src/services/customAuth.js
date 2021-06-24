const md5 = require('md5')
const bcrypt = require('bcrypt')
const nodemailer = require("nodemailer")
const { CustomAuth } = require('../models/index')
const { map: { title }, alwaysEnabledPerms, customAuth, manualAreas } = require('./config')
const areas = require('./areas.js')

class CustomAuthClient {
  async authenticate(username, password) {
    const result = {}
    await CustomAuth.query()
      .findOne({ [customAuth.settings.usernameDbField]: username })
      .then(async (userExists) => {
        if (!userExists) {
          result.authentication = false
          result.message = 'User not found'
          result.code = 'userNotFound'
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
            result.code = 'incorrectPassword'
          } else {
            if (customAuth.confirmationEmail && userExists[customAuth.settings.statusDbField] === customAuth.settings.visitorStatus) {
              result.authentication = false
              result.message = 'User registration not confirmed'
              result.code = 'userNotConfirmed'
            } else {
              const tzoffset = (new Date()).getTimezoneOffset() * 60000
              const localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, 19).replace('T', ' ')
              await CustomAuth.query()
                  .where({ [customAuth.settings.usernameDbField]: username })
                  .update({ [customAuth.settings.lastConnectedDbField]: localISOTime })
              result.authentication = true
              result.message = 'Authentication successful'
              result.userData = userExists
            }
          }
        }
      })
    return result
  }

  async register(data) {
    const result = { isSuccessful: false }
    const tzoffset = (new Date()).getTimezoneOffset() * 60000
    const localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, 19).replace('T', ' ')
    await CustomAuth.query()
      .findOne({ [customAuth.settings.usernameDbField]: data.registerUsername })
      .then(async (userAlreadyExists) => {
        if (userAlreadyExists) {
          result.isSuccessful = false
          result.message = 'userAlreadyExists'
        } else {
          await CustomAuth.query()
            .findOne({ [customAuth.settings.discordNicknameDbField]: data.registerDiscord })
            .then(async (userDiscordAlreadyExists) => {
              if (data.registerDiscord && userDiscordAlreadyExists) {
                result.isSuccessful = false
                result.message = 'userDiscordAlreadyExists'
              } else {
                let passwordHashed
                if (customAuth.settings.passwordEncryption === "bcrypt") {
                  passwordHashed = await bcrypt.hash(data.registerPassword, 5)
                } else if (customAuth.settings.passwordEncryption === "md5") {
                  passwordHashed = md5(data.registerPassword)
                } else {
                  passwordHashed = data.registerPassword
                }
                const insertData = {
                  [customAuth.settings.usernameDbField]: data.registerUsername,
                  [customAuth.settings.passwordDbField]: passwordHashed,
                  [customAuth.settings.emailDbField]: data.registerEmail,
                  [customAuth.settings.discordNicknameDbField]: data.registerDiscord,
                  [customAuth.settings.statusDbField]: customAuth.settings.visitorStatus,
                  [customAuth.settings.registrationDateDbField]: localISOTime
                }
                if (Object.keys(manualAreas).length > 0) insertData[customAuth.settings.areaDbField] = data.registerArea
                await CustomAuth.query()
                  .insert(insertData)
                  .then((userRegistered) => {
                    if (userRegistered) {
                      result.isSuccessful = true
                      result.message = 'registerSuccess'
                      if (customAuth.confirmationEmail && data.registerConfirmationEmail) {
                        const confirmationLink = `${customAuth.siteDomain}/auth/confirmation/${data.registerUsername}/${md5(data.registerEmail)}`
                        const textFormatted = data.registerConfirmationEmail.text.replace(/\{1}/g, data.registerUsername).replace(/\{2}/g, title).replace(/\{3}/g, confirmationLink)
                        const htmlFormatted = data.registerConfirmationEmail.html.replace(/\{1}/g, data.registerUsername).replace(/\{2}/g, title).replace(/\{3}/g, confirmationLink)
                        let transporter = nodemailer.createTransport(customAuth.nodemailerOptions)
                        transporter.sendMail({
                          from: customAuth.senderAddress,
                          to: data.registerEmail,
                          subject: data.registerConfirmationEmail.subject,
                          text: textFormatted,
                          html: htmlFormatted
                        })
                        result.message = 'registerSuccessEmail'
                      }
                    }
                  })
              }
            })
        }
      })
    return result
  }

  async confirm(data) {
    const result = {}
    await CustomAuth.query()
        .findOne({ [customAuth.settings.usernameDbField]: data.confirmationUsername })
        .then(async (userExists) => {
          if (!userExists) {
            result.isSuccessful = false
            result.message = 'User not found'
            result.code = 'userNotFound'
          } else {
            if (userExists[customAuth.settings.statusDbField] !== customAuth.settings.visitorStatus) {
              result.isSuccessful = true
              result.message = 'User registration already confirmed'
              result.code = 'userAlreadyConfirmed'
            } else {
              const confirmationMatch = md5(userExists[customAuth.settings.emailDbField])
              if (data.confirmationCode === confirmationMatch) {
                await CustomAuth.query()
                    .where({ [customAuth.settings.usernameDbField]: data.confirmationUsername })
                    .update({ [customAuth.settings.statusDbField]: customAuth.settings.emailConfirmedStatus })
                result.isSuccessful = true
                result.message = 'User registration confirmed'
                result.code = 'userRegistrationConfirmed'
              } else {
                result.isSuccessful = false
                result.message = 'User registration code mismatch'
                result.code = 'userRegistrationCodeMismatch'
              }
            }
          }
        })
    return result
  }

  async update(data) {
    const result = {}
    await CustomAuth.query()
        .findOne({ [customAuth.settings.usernameDbField]: data.username })
        .then(async (userExists) => {
          if (!userExists) {
            result.isSuccessful = false
            result.message = 'User not found'
            result.code = 'userNotFound'
          } else {
            await CustomAuth.query()
              .where({ [customAuth.settings.usernameDbField]: data.username })
              .update({
                [customAuth.settings.discordNicknameDbField]: data.updateProfileData.discordNickname,
                [customAuth.settings.discordIdDbField]: data.updateProfileData.discordId,
                [customAuth.settings.areaDbField]: data.updateProfileData.area,
              })
            result.isSuccessful = true
            result.message = 'User profile updated'
            result.code = 'userProfileUpdated'
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
      console.log(`[CustomAuth] User ${user[customAuth.settings.usernameDbField]} in allowed users list, skipping permission check.`)
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
