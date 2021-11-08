const extend = require('extend')
const uConfig = require('../configs/config.json')
const eConfig = require('../configs/default.json')
const initWebhooks = require('./initWebhooks')

const target = {}

extend(true, target, eConfig, uConfig)

if (target.icons.defaultIcons.misc) {
  console.warn('Warning: Setting the misc category to anything does not have an impact on the icons.')
}
if (target.webhooks.length) {
  (async () => {
    target.webhookObj = await initWebhooks(target)
  })()
}

module.exports = target
