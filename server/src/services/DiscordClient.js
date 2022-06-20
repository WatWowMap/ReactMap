/* eslint-disable no-console */
/* eslint-disable class-methods-use-this */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
/* eslint-disable global-require */
/* eslint-disable import/no-dynamic-require */
/* global BigInt */
const fs = require('fs')
const {
  authentication: { alwaysEnabledPerms },
  scanner,
  webhooks,
} = require('./config')
const Utility = require('./Utility')

module.exports = class DiscordMapClient {
  constructor(client, config, accessToken) {
    this.client = client
    this.config = config
    this.accessToken = accessToken
    this.discordEvents()
  }

  setAccessToken(token) {
    this.accessToken = token
  }

  async getUserRoles(guildId, userId) {
    try {
      const members = await this.client.guilds.cache
        .get(guildId)
        .members.fetch()
      const member = members.get(userId)
      const roles = member.roles.cache
        .filter((x) => BigInt(x.id).toString())
        .keyArray()
      return roles
    } catch (e) {
      console.error(
        '[DISCORD] Failed to get roles in guild',
        guildId,
        'for user',
        userId,
      )
    }
    return []
  }

  async discordEvents() {
    this.client.config = this.config
    try {
      fs.readdir(`${__dirname}/events/`, (err, files) => {
        if (err) return this.log.error(err)
        files.forEach((file) => {
          const event = require(`${__dirname}/events/${file}`)
          const eventName = file.split('.')[0]
          this.client.on(eventName, event.bind(null, this.client))
        })
      })
    } catch (e) {
      console.error('[DISCORD] Failed to activate an event', e.message)
    }
  }

  async getPerms(user) {
    const perms = Object.fromEntries(
      Object.keys(this.config.perms).map((x) => [x, false]),
    )
    perms.areaRestrictions = []
    perms.webhooks = []
    perms.scanner = []
    try {
      const { guildsFull } = user
      const guilds = user.guilds.map((guild) => guild.id)
      if (this.config.allowedUsers.includes(user.id)) {
        Object.keys(perms).forEach((key) => (perms[key] = true))
        perms.areaRestrictions = []
        perms.webhooks = webhooks.map((x) => x.name)
        perms.scanner = Object.keys(scanner).filter(
          (x) => x !== 'backendConfig' && x && scanner[x].enabled,
        )
        console.log(
          `[DISCORD] User ${user.username}#${user.discriminator} (${user.id}) in allowed users list, skipping guild and role check.`,
        )
        return perms
      }
      for (let i = 0; i < this.config.blockedGuilds.length; i += 1) {
        const guildId = this.config.blockedGuilds[i]
        if (guilds.includes(guildId)) {
          perms.blocked = guildsFull.find((x) => x.id === guildId).name
          return perms
        }
      }
      for (let i = 0; i < this.config.allowedGuilds.length; i += 1) {
        const guildId = this.config.allowedGuilds[i]
        if (guilds.includes(guildId)) {
          const keys = Object.keys(this.config.perms)
          const userRoles = await this.getUserRoles(guildId, user.id)
          // Roles & Perms
          for (let j = 0; j < keys.length; j += 1) {
            const key = keys[j]
            const configItem = this.config.perms[key]
            if (configItem.enabled) {
              if (alwaysEnabledPerms.includes(key)) {
                perms[key] = true
              } else {
                for (let k = 0; k < userRoles.length; k += 1) {
                  if (configItem.roles.includes(userRoles[k])) {
                    perms[key] = true
                  }
                }
              }
            }
          }
          perms.areaRestrictions.push(
            ...Utility.areaPerms(userRoles, 'discord'),
          )
          perms.webhooks.push(
            ...Utility.webhookPerms(userRoles, 'discordRoles'),
          )
          perms.scanner.push(...Utility.scannerPerms(userRoles, 'discordRoles'))
        }
      }
      if (perms.areaRestrictions.length) {
        perms.areaRestrictions = [...new Set(perms.areaRestrictions)]
      }
      if (perms.webhooks.length) {
        perms.webhooks = [...new Set(perms.webhooks)]
      }
    } catch (e) {
      console.warn('[DISCORD] Failed to get perms for user', user.id, e.message)
    }
    return perms
  }

  async sendMessage(channelId, message) {
    if (!channelId) {
      return
    }
    try {
      const channel = await this.client.channels.cache.get(channelId).fetch()
      if (channel && message) {
        channel.send(message)
      }
    } catch (e) {
      console.error('[DISCORD] Failed to send message to discord', e.message)
    }
  }
}
