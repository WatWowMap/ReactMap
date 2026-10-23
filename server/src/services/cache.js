// @ts-check
const fs = require('fs')
const path = require('path')

const { log, TAGS } = require('@rm/logger')

const CACHE_DIR = process.env.NODE_CONFIG_ENV
  ? path.join(__dirname, '../../.cache', process.env.NODE_CONFIG_ENV)
  : path.join(__dirname, '../../.cache')

/** @param {string} str */
const fsFriendlyName = (str) =>
  str.startsWith('http') ? `${str.replace(/\//g, '__')}.json` : str

/**
 * @template T
 * @param {string} unsafeName
 * @param {T} [fallback]
 * @returns {T}
 */
const getCache = (unsafeName, fallback = null) => {
  const fileName = fsFriendlyName(unsafeName)
  try {
    if (!fs.existsSync(path.resolve(CACHE_DIR, fileName))) return fallback
    const data = JSON.parse(
      fs.readFileSync(path.resolve(CACHE_DIR, fileName), 'utf-8'),
    )
    if (fallback) {
      Object.entries(fallback).forEach(([key, value]) => {
        if (!(key in data)) data[key] = value
      })
    }
    log.info(TAGS.cache, 'Loaded', fileName)
    return data
  } catch (e) {
    return fallback
  }
}

/**
 * @param {string} unsafeName
 * @param {object | string} data
 */
const setCache = async (unsafeName, data) => {
  const fileName = fsFriendlyName(unsafeName)
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      await fs.promises.mkdir(CACHE_DIR, { recursive: true })
    }
    await fs.promises.writeFile(
      path.resolve(CACHE_DIR, fileName),
      typeof data === 'string' ? data : JSON.stringify(data),
    )
    log.info(TAGS.cache, 'Cached', fileName)
  } catch (e) {
    log.error(TAGS.cache, e)
  }
}

/**
 * Reads a cached file, atomically creating it first if it is missing, so that
 * processes sharing the cache dir (e.g. PM2 cluster workers) all agree on it
 * @template T
 * @param {string} unsafeName
 * @param {() => T} create
 * @returns {T}
 */
const getOrCreateCache = (unsafeName, create) => {
  const fileName = fsFriendlyName(unsafeName)
  const filePath = path.resolve(CACHE_DIR, fileName)
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true })
    const tempPath = `${filePath}.${process.pid}.tmp`
    fs.writeFileSync(tempPath, JSON.stringify(create()))
    try {
      // unlike rename, link fails if another process created the file first
      fs.linkSync(tempPath, filePath)
      log.info(TAGS.cache, 'Cached', fileName)
    } catch (e) {
      if (e.code !== 'EEXIST') throw e
    } finally {
      fs.unlinkSync(tempPath)
    }
  }
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  log.info(TAGS.cache, 'Loaded', fileName)
  return data
}

module.exports = {
  getCache,
  setCache,
  getOrCreateCache,
}
