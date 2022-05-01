/* eslint-disable no-console */
const fs = require('fs')
const sourceConfig = require('../src/configs/default.json')

const camelToSnake = str => str.replace(/([a-z](?=[A-Z]))/g, '$1_').toUpperCase()

const recursiveObjCheck = (obj, key = '', parentKey = '') => {
  const snakeKey = `${parentKey}${camelToSnake(key)}`
  if (Array.isArray(obj)) {
    return { __name: snakeKey, __format: 'json' }
  }
  if (typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => (
        [k, recursiveObjCheck(v, k, key ? `${snakeKey}_` : snakeKey)]
      )),
    )
  }
  return typeof obj === 'string'
    ? snakeKey
    : { __name: snakeKey, __format: typeof obj }
}

const generateEnvConfig = async () => {
  fs.writeFileSync(
    `${__dirname}/../src/configs/custom-environment-variables.json`,
    JSON.stringify(recursiveObjCheck(sourceConfig), null, 2),
  )
}

module.exports.generateEnvConfig = generateEnvConfig

if (require.main === module) {
  generateEnvConfig().then(() => console.log('Env Config Generated'))
}
