// @ts-check
const fs = require('fs')
const { resolve } = require('path')

const { log, HELPERS } = require('@rm/logger')

/**
 *
 * @param {string} fileName
 * @param {string} [domain]
 * @returns
 */
function checkConfigJsons(fileName, domain = '') {
  const generalJson = fs.existsSync(
    resolve(`${__dirname}/../../configs/${fileName}.json`),
  )
    ? JSON.parse(
        fs.readFileSync(
          resolve(__dirname, `../../configs/${fileName}.json`),
          'utf8',
        ),
      )
    : {}
  if (Object.keys(generalJson).length) {
    log.info(
      HELPERS.config,
      domain ? `[${domain}]` : '',
      `config ${fileName}.json found, overwriting your config.map.${fileName} with the found data.`,
    )
  }
  if (
    domain &&
    fs.existsSync(
      resolve(`${__dirname}/../../configs/${fileName}/${domain}.json`),
    )
  ) {
    const domainJson =
      JSON.parse(
        fs.readFileSync(
          resolve(__dirname, `../../configs/${fileName}/${domain}.json`),
          'utf8',
        ),
      ) || {}
    if (Object.keys(domainJson).length) {
      log.info(
        HELPERS.config,
        domain,
        `config ${fileName}/${domain}.json found, overwriting your config.map.${fileName} with the found data.`,
      )
    }
    return {
      components: [],
      ...generalJson,
      ...domainJson,
    }
  }
  return generalJson
}

module.exports = checkConfigJsons
