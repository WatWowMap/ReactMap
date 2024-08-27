// @ts-check

const fs = require('fs')
const path = require('path')

fs.writeFileSync(
  path.join(__dirname, '../../.configref'),
  fs
    .readFileSync(
      path.join(__dirname, '../../../../config/default.json'),
      'utf8',
    )
    .length.toString(),
)
