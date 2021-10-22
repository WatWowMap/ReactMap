const extend = require('extend')
const uConfig = require('../configs/config.json');
const eConfig = require('../configs/default.json');

const target = {}

extend(true, target, eConfig, uConfig)

if (target.icons.defaultIcons.misc) {
  console.warn('Warning: Setting the misc category to anything does not have an impact on the icons.')
}
module.exports = target
