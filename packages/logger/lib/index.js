// @ts-check
if (!process.env.FORCE_COLOR) {
  process.env.FORCE_COLOR = '3'
}

const logger = require('loglevel')
const { TAGS } = require('./tags')
const { Logger } = require('./Logger')

const globalLogger = new Logger()

/** @param {import('loglevel').LogLevelNames} logLevel */
const setGlobalLogLevel = (logLevel = 'info') => {
  logger.setLevel(logLevel)
  logger.setDefaultLevel(logLevel)
  Object.values(logger.getLoggers()).forEach((l) => l.setLevel(logLevel))
  globalLogger.log.info(TAGS.config, `set global logging to '${logLevel}'`)
}

module.exports.log = globalLogger.log

module.exports.TAGS = TAGS

module.exports.Logger = Logger

module.exports.setGlobalLogLevel = setGlobalLogLevel
