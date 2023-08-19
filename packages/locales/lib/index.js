const fs = require('fs')
const path = require('path')

const { create } = require('./create')
const { missing } = require('./missing')
const { generate } = require('./generate')

const locales = fs.readdirSync(path.resolve(__dirname, './translations'))

module.exports.locales = locales
module.exports.create = create
module.exports.missing = missing
module.exports.generate = generate
