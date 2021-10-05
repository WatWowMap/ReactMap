const extend = require('extend')
const uConfig = require('../configs/config.json');
const eConfig = require('../configs/default.json');

const target = {}

extend(true, target, eConfig, uConfig)

if (target.icons.defaultIcons.misc) {
  console.warn('Warning: If you set the misc category to anything but the base set there may be missing icons on your map!')
}
module.exports = target
