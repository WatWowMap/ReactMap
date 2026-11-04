// @ts-check
// Consumers such as vite.config.js rely on `.env` being loaded here
// (e.g. NODE_CONFIG_ENV selects the dist-* output dir), so keep this
require('dotenv').config()

const { create } = require('./create')
const { missing } = require('./missing')
const {
  readLocaleDirectory,
  writeAll,
  getStatus,
  readAndParseJson,
} = require('./utils')

const locales = readLocaleDirectory(true).map((x) => x.replace('.json', ''))
const status = getStatus()

module.exports.locales = locales
module.exports.status = status
module.exports.create = create
module.exports.missing = missing
module.exports.writeAll = writeAll
module.exports.readAndParseJson = readAndParseJson
