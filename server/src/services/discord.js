/* eslint-disable no-console */
/* eslint-disable class-methods-use-this */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
/* eslint-disable global-require */
/* eslint-disable import/no-dynamic-require */
/* global BigInt */
const Discord = require('discord.js')
const fs = require('fs')
const { alwaysEnabledPerms, discord, webhooks } = require('./config')
const Utility = require('./Utility')

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
    } catch (e) {
      console.error('Failed to activate an event', e.message)
    }
  }

  async getPerms(user) {
    const perms = Object.fromEntries(Object.keys(discord.perms).map(x => [x, false]))
    perms.areaRestrictions = []
    perms.webhooks = []
    try {
      const { guildsFull } = user
      const guilds = user.guilds.map(guild => guild.id)
      if (discord.allowedUsers.includes(user.id)) {
        Object.keys(perms).forEach((key) => perms[key] = true)
        perms.areaRestrictions = []
        perms.webhooks = webhooks.map(x => x.name)
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
          // Roles & Perms
          for (let j = 0; j < keys.length; j += 1) {
            const key = keys[j]
            const configItem = discord.perms[key]
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
          perms.areaRestrictions = Utility.areaPerms(userRoles, 'discord')
          perms.webhooks = Utility.webhookPerms(userRoles, 'discordRoles')
        }
      }
    } catch (e) {
      console.warn('Failed to get perms for user', user.id, e.message)
    }
    console.log(perms)
    return perms
  }

  async sendMessage(channelId, message) {
    if (!channelId) {
      return
    }
    try {
      const channel = await client.channels.cache
        .get(channelId)
        .fetch()
      if (channel && message) {
        channel.send(message)
      }
    } catch (e) {
      console.error('Failed to send message to discord', e.message)
    }
  }
}

module.exports = new DiscordClient()
