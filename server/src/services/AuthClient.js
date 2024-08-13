// @ts-check
/* eslint-disable no-unused-vars */
const { Logger } = require('@rm/logger')
const config = require('@rm/config')

const { Trial: TrialManager } = require('./Trial')

/**
 * @typedef {(rmStrategy: string, strategy: import("@rm/types").StrategyConfig) => void} ClientConstructor
 * @typedef {import('discord.js').APIEmbed | string} MessageEmbed
 */

const dateFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'short',
  timeStyle: 'medium',
})

class AuthClient extends Logger {
  /** @type {ClientConstructor} */
  constructor(rmStrategy, strategy) {
    super(strategy.type, rmStrategy)
    this.rmStrategy = rmStrategy || 'custom'
    this.trialManager = new TrialManager(strategy)
    this.loggingChannels = {
      main: strategy.logChannelId,
      event: strategy.eventLogChannelId,
      scanNext: strategy.scanNextLogChannelId,
      scanZone: strategy.scanZoneLogChannelId,
    }
    this.strategy = {
      thumbnailUrl:
        'https://user-images.githubusercontent.com/58572875/167069223-745a139d-f485-45e3-a25c-93ec4d09779c.png',
      ...strategy,
    }
    this.loggingChannelHidePii = strategy.logChannelHidePii
    this.perms = config.getSafe('authentication.perms')
    this.alwaysEnabledPerms = config.getSafe(
      'authentication.alwaysEnabledPerms',
    )
  }

  getBaseEmbed() {
    return {
      author: {
        name: this.rmStrategy,
        icon_url: this.strategy.thumbnailUrl,
      },
      timestamp: new Date().toISOString(),
    }
  }

  /**
   *
   * @param {MessageEmbed} embed
   * @returns {string}
   */
  static getHtml(embed) {
    if (typeof embed === 'string') return embed
    const { title, author, thumbnail, description, fields, footer } = embed
    return `
      ${title ? `<h2>${title}</h2>` : ''}
      ${author ? `<p><strong>${author.name}</strong></p>` : ''}
      ${thumbnail ? `<img src="${thumbnail.url}" alt="thumbnail" />` : ''}
      ${description ? `<p>${description}</p>` : ''}
      ${
        fields
          ? fields
              .map(
                ({ name, value }) =>
                  `<p><strong>${name}</strong>: ${value}</p>`,
              )
              .join('')
          : ''
      }
      ${footer ? `<p><em>${footer.text}</em></p>` : ''}
      ${
        embed.timestamp
          ? `<p><em>${dateFormat.format(new Date(embed.timestamp))}</em></p>`
          : ''
      }
    `
  }

  /**
   * @param {MessageEmbed} embed
   * @param {keyof AuthClient['loggingChannels']} [channel]
   */
  async sendMessage(embed, channel = 'main') {
    this.log.info(
      '`message` is not implemented for base AuthClient - you probably should not be seeing this',
    )
  }

  /** @returns {void} */
  initPassport() {
    this.log.info(
      '`initPassport` is not implemented for base AuthClient - you probably should not be seeing this',
    )
  }
}

module.exports = AuthClient
