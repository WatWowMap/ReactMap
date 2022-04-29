/* eslint-disable no-nested-ternary */
/* eslint-disable no-console */
const fs = require('fs')
const sourceConfig = require('../src/configs/default.json')

const camelToSnake = str => str.replace(/([a-z](?=[A-Z]))/g, '$1_').toUpperCase()

const recursiveObjCheck = (key, obj, parentKey = '') => {
  const snakeKey = `${parentKey}${camelToSnake(key)}`
  if (Array.isArray(obj)) {
    return { __name: snakeKey, __format: 'json' }
  }
  if (typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => (
        [k, recursiveObjCheck(k, v, `${snakeKey}_`)]
      )),
    )
  }
  return typeof obj === 'string'
    ? snakeKey
    : { __name: snakeKey, __format: typeof obj }
}

const generateEnvConfig = async () => {
  const envConfig = {}

  Object.entries(sourceConfig).forEach(([key, value]) => {
    envConfig[key] = typeof value === 'object'
      ? recursiveObjCheck(key, value)
      : typeof value === 'string'
        ? camelToSnake(key)
        : { __name: camelToSnake(key), __format: typeof value }
  })

  fs.writeFileSync(
    `${__dirname}/../src/configs/custom-environment-variables.json`,
    JSON.stringify(envConfig, null, 2),
  )
}

module.exports.generateEnvConfig = generateEnvConfig

if (require.main === module) {
  generateEnvConfig().then(() => console.log('Env Config Generated'))
}
