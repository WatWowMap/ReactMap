/* eslint-disable class-methods-use-this */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
/* eslint-disable global-require */
/* eslint-disable import/no-dynamic-require */
/* global BigInt */
const Discord = require('discord.js')
const fs = require('fs')
const { alwaysEnabledPerms, discord } = require('./config')

const client = new Discord.Client()

if (discord.enabled) {
  client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`)
    client.user.setPresence({
      activity: {
        name: discord.presence,
        type: discord.presenceType,
      },
    })
  })
  client.login(discord.botToken)
}

class DiscordClient {
  constructor(accessToken) {
    this.accessToken = accessToken
    this.discordEvents()
  }

  setAccessToken(token) {
    this.accessToken = token
  }

  async getUserRoles(guildId, userId) {
    try {
      const members = await client.guilds.cache
        .get(guildId)
        .members
        .fetch()
      const member = members.get(userId)
      const roles = member.roles.cache
        .filter(x => BigInt(x.id).toString())
        .keyArray()
      return roles
    } catch (e) {
      console.error('Failed to get roles in guild', guildId, 'for user', userId)
    }
    return []
  }

  async discordEvents() {
    client.config = discord
    try {
      fs.readdir(`${__dirname}/events/`, (err, files) => {
        if (err) return this.log.error(err)
        files.forEach((file) => {
          const event = require(`${__dirname}/events/${file}`)
          const eventName = file.split('.')[0]
          client.on(eventName, event.bind(null, client))
        })
      })
    } catch (err) {
      console.error('Failed to activate an event')
    }
  }

  async getPerms(user) {
    const perms = {}
    Object.keys(discord.perms).map(perm => perms[perm] = false)
    perms.areaRestrictions = []

    const { guildsFull } = user
    const guilds = user.guilds.map(guild => guild.id)
    if (discord.allowedUsers.includes(user.id)) {
      Object.keys(perms).forEach((key) => perms[key] = true)
      console.log(`User ${user.username}#${user.discriminator} (${user.id}) in allowed users list, skipping guild and role check.`)
      return perms
    }
    for (let i = 0; i < discord.blockedGuilds.length; i += 1) {
      const guildId = discord.blockedGuilds[i]
      if (guilds.includes(guildId)) {
        perms.blocked = guildsFull.find(x => x.id === guildId).name
        return perms
      }
    }
    for (let i = 0; i < discord.allowedGuilds.length; i += 1) {
      const guildId = discord.allowedGuilds[i]
      if (guilds.includes(guildId)) {
        const keys = Object.keys(discord.perms)
        const userRoles = await this.getUserRoles(guildId, user.id)

        for (let j = 0; j < keys.length; j += 1) {
          const key = keys[j]
          const configItem = discord.perms[key]
          if (configItem.enabled) {
            if (configItem.roles.length === 0
              || alwaysEnabledPerms.includes(key)) {
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
      }
    }
    return perms
  }

  async sendMessage(channelId, message) {
    if (!channelId) {
      return
    }
    const channel = await client.channels.cache
      .get(channelId)
      .fetch()
    if (channel && message) {
      channel.send(message)
    }
  }
}

module.exports = new DiscordClient()
