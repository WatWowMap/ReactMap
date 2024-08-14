// @ts-check
const fs = require('fs')
const path = require('path')

const { log, TAGS } = require('@rm/logger')

const [, serverConfigDir] = (process.env.NODE_CONFIG_DIR || '').split(
  path.delimiter,
)

/**
 *
 * @param {string} fileName
 * @param {string} [domain]
 * @returns
 */
function validateJsons(fileName, domain = process.env.NODE_CONFIG_ENV || '') {
  if (!serverConfigDir) {
    throw new Error('Invalid NODE_CONFIG_DIR')
  }
  const generalJson = fs.existsSync(
    path.join(serverConfigDir, `${fileName}.json`),
  )
    ? JSON.parse(
        fs.readFileSync(path.join(serverConfigDir, `${fileName}.json`), 'utf8'),
      )
    : {}
  if (Object.keys(generalJson).length && !domain) {
    log.info(
      TAGS.config,
      `${fileName}.json found, overwriting your config.map.${fileName} with the found data.`,
    )
  }
  if (
    domain &&
    fs.existsSync(path.join(serverConfigDir, `${fileName}/${domain}.json`))
  ) {
    const domainJson =
      JSON.parse(
        fs.readFileSync(
          path.join(serverConfigDir, `${fileName}/${domain}.json`),
          'utf8',
        ),
      ) || {}
    if (Object.keys(domainJson).length) {
      log.info(
        TAGS.config,
        `${fileName}/${domain}.json found, overwriting your config.map.${fileName} for ${domain} with the found data.`,
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

module.exports = { validateJsons }
