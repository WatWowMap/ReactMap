const { create } = require('./create')
const { missing } = require('./missing')
const { generate } = require('./generate')
const { readLocaleDirectory, writeAll, getStatus } = require('./utils')

const locales = readLocaleDirectory(true).map((x) => x.replace('.json', ''))
const status = getStatus()

module.exports.locales = locales
module.exports.status = status
module.exports.create = create
module.exports.missing = missing
module.exports.generate = generate
module.exports.writeAll = writeAll
