const fs = require('fs')
const path = require('path')

const { log, HELPERS } = require('@rm/logger')

const CACHE_DIR = path.join(__dirname, '../../.cache')

/**
 * @template T
 * @param {string} fileName
 * @param {T} [fallback]
 * @returns {T}
 */
const getCache = (fileName, fallback = null) => {
  try {
    if (!fs.existsSync(path.resolve(CACHE_DIR, fileName))) return fallback
    const data = JSON.parse(
      fs.readFileSync(path.resolve(CACHE_DIR, fileName), 'utf-8'),
    )
    log.info(HELPERS.cache, 'Loaded', fileName)
    return data
  } catch (e) {
    return fallback
  }
}

/**
 * @param {string} fileName
 * @param {object | string} data
 */
const setCache = async (fileName, data) => {
  try {
    if (!fs.existsSync(CACHE_DIR)) await fs.promises.mkdir(CACHE_DIR)
    await fs.promises.writeFile(
      path.resolve(CACHE_DIR, fileName),
      typeof data === 'string' ? data : JSON.stringify(data),
    )
    log.info(HELPERS.cache, 'Cached', fileName)
  } catch (e) {
    log.error(HELPERS.cache, e)
  }
}

module.exports = {
  getCache,
  setCache,
}
