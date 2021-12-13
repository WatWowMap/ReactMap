/* eslint-disable no-console */
const extend = require('extend')
const fs = require('fs')
const uConfig = require('../configs/config.json')
const eConfig = require('../configs/default.json')
const initWebhooks = require('./initWebhooks')

const target = {}

extend(true, target, eConfig, uConfig)

try {
  target.authMethods = []
  fs.readdir(`${__dirname}/../strategies/`, (e, files) => {
    if (e) return console.error(e)
    files.forEach(file => {
      const trimmed = file.replace('.js', '')
      if (target[trimmed]?.enabled) {
        target.authMethods.push(trimmed)
      }
    })
  })
} catch (e) {
  console.error('Failed to initialize a strategy', e)
}

if (target.map.messageOfTheDay.messages) {
  console.warn('You are using an old API endpoint in the message of the day section, the [messages] array should be renamed to [components]! \n They have been migrated for you in the meantime but you should update your config.json file.')

  const updateFieldRec = (messages) => messages.map(message => {
    if (message.messages) {
      message.components = updateFieldRec(message.messages)
      delete message.messages
    }
    return message
  })

  target.map.messageOfTheDay.components = target.map.messageOfTheDay.messages.map(m => {
    if (m.type !== 'parent') return m
    if (m.messages) {
      m.components = m.components || updateFieldRec(m.messages)
      delete m.messages
    }
    return m
  })
  delete target.map.messageOfTheDay.messages
}

if (target.icons.defaultIcons.misc) {
  console.warn('Warning: Setting the misc category to anything does not have an impact on the icons.')
}
if (target.webhooks.length) {
  (async () => {
    target.webhookObj = await initWebhooks(target)
  })()
}

module.exports = target
