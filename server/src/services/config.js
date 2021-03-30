const extend = require('extend')
const uConfig = require('../configs/config.json');
const eConfig = require('../configs/default.json');

const target = {}

extend(true, target, eConfig, uConfig)

module.exports = target
