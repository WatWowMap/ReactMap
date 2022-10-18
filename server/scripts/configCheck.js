const fs = require('fs')
const path = require('path')

fs.writeFileSync(
  path.resolve(__dirname, '../../.configref'),
  fs
    .readFileSync(
      path.resolve(__dirname, '../src/configs/default.json'),
      'utf8',
    )
    .length.toString(),
)
