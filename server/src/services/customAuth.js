const md5 = require('md5')
const bcrypt = require('bcrypt')
const nodemailer = require("nodemailer")
const { CustomAuth } = require('../models/index')
const {
  map: {
    title
  },
  alwaysEnabledPerms,
  customAuth,
  manualAreas,
  discord: {
    enabled,
    logChannelId,
  },
} = require('./config')
const areas = require('./areas.js')
const DiscordClient = require('./discord')

const sendDiscordLogMsg = async (msgType, user) => {
  if (!(enabled && customAuth.enableDiscordLog)) return
  const embed = {}
  switch (msgType) {
    case 'userNotFound':
      embed.color = 0xFF0000
      embed.title = 'Authentication'
      embed.description = `Authentication failed for user **${user}** : user not found`
      break
    case 'incorrectPassword':
      embed.color = 0xFF0000
      embed.title = 'Authentication'
      embed.description = `Authentication failed for user **${user}** : wrong password`
      break
    case 'userNotConfirmed':
      embed.color = 0xFF0000
      embed.title = 'Authentication'
      embed.description = `Authentication failed for user **${user}** : registration not confirmed`
      break
    case 'authenticationSuccessful':
      embed.color = 0x00FF00
      embed.title = 'Authentication'
      embed.description = `Authentication successful for user **${user}**`
      break
    case 'registerSuccess':
    case 'userRegistrationConfirmed':
      embed.color = 0x00FF00
      embed.title = 'Registration'
      embed.description = `Registration successful for user **${user}**`
      break
    case 'registerSuccessEmail':
      embed.color = 0xD0D0D0
      embed.title = 'Registration'
      embed.description = `Registration successful for user **${user}** - pending email confirmation`
      break
    case 'userProfileUpdated':
      embed.color = 0x0000FF
      embed.title = 'Profile Update'
      embed.description = `Profile updated for user **${user.username}**`
      embed.fields = [
        {
          name: 'Discord Nickname',
          value: user.discordNickname || '-',
          inline: true,
        },
        {
          name: 'Discord Id',
          value: user.discordId || '-',
          inline: true,
        },
        {
          name: 'Area',
          value: user.area,
          inline: true,
        },
      ]
      break
  }
  embed.timestamp = new Date()

  await DiscordClient.sendMessage(logChannelId, { embed })
}

class CustomAuthClient {
  async authenticate(username, password) {
    const result = {}
    await CustomAuth.query()
      .where({ [customAuth.settings.usernameDbField]: username })
      .orWhere({ [customAuth.settings.emailDbField]: username })
      .first()
      .then(async (userExists) => {
        if (!userExists) {
          result.authentication = false
          result.message = 'User not found'
          result.code = 'userNotFound'
          await sendDiscordLogMsg('userNotFound', username)
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
            await sendDiscordLogMsg('incorrectPassword', userExists[customAuth.settings.usernameDbField])
          } else {
            if (customAuth.confirmationEmail && userExists[customAuth.settings.statusDbField] === customAuth.settings.visitorStatus) {
              result.authentication = false
              result.message = 'User registration not confirmed'
              result.code = 'userNotConfirmed'
              await sendDiscordLogMsg('userNotConfirmed', userExists[customAuth.settings.usernameDbField])
            } else {
              const tzoffset = (new Date()).getTimezoneOffset() * 60000
              const localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, 19).replace('T', ' ')
              await CustomAuth.query()
                  .where({ [customAuth.settings.usernameDbField]: userExists[customAuth.settings.usernameDbField] })
                  .update({ [customAuth.settings.lastConnectedDbField]: localISOTime })
              result.authentication = true
              result.message = 'Authentication successful'
              result.userData = userExists
              await sendDiscordLogMsg('authenticationSuccessful', userExists[customAuth.settings.usernameDbField])
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
            .findOne({ [customAuth.settings.emailDbField]: data.registerEmail })
            .then(async (emailAlreadyExists) => {
              if (emailAlreadyExists) {
                result.isSuccessful = false
                result.message = 'emailAlreadyExists'
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
                        .then(async (userRegistered) => {
                          if (userRegistered) {
                            result.isSuccessful = true
                            result.message = 'registerSuccess'
                            await sendDiscordLogMsg('registerSuccess', data.registerUsername)
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
                              await sendDiscordLogMsg('registerSuccessEmail', data.registerUsername)
                            }
                          }
                        })
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
                await sendDiscordLogMsg('userRegistrationConfirmed', data.confirmationUsername)
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
            await sendDiscordLogMsg('userProfileUpdated', { username: data.username, ...data.updateProfileData })
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
