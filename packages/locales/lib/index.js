const { create } = require('./create')
const { missing } = require('./missing')
const { generate } = require('./generate')
const { readLocaleDirectory } = require('./utils')

const locales = readLocaleDirectory(true)

module.exports.locales = locales
module.exports.create = create
module.exports.missing = missing
module.exports.generate = generate
