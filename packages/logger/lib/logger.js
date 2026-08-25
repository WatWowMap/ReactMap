// @ts-check
const logger = require('loglevel')
const { TAGS } = require('./tags')

class Logger {
  #tags

  /** @param {...string} tags */
  constructor(...tags) {
    this.#tags = tags
    this.log = logger.getLogger(this.loggerTag || 'logger')

    this.log.methodFactory = (methodName, logLevel, loggerName) => {
      const rawMethod = logger.methodFactory(methodName, logLevel, loggerName)
      const tag = Logger.#formatTags(this.#tags).trim()
      return (...args) => {
        rawMethod(
          ...[TAGS[methodName], Logger.getTimestamp(), tag].filter(Boolean),
          ...args,
        )
      }
    }

    this.log.setLevel(logger.getLevel())
  }

  static getTimestamp() {
    return new Date().toISOString().split('.')[0].split('T').join(' ')
  }

  /** @param {string[]} tags */
  static #formatTags(tags) {
    let finalTag = ''
    for (let i = 0; i < tags.length; i++) {
      const tag = tags[i]
      if (!tag) continue
      if (finalTag) finalTag += ' '
      if (tag in TAGS) {
        const helper = TAGS[tag]
        if (typeof helper === 'function') {
          const firstArg = tags[++i]
          let secondArg = ''
          if (helper === 'custom') {
            secondArg = tags[++i]
          }
          finalTag += helper(
            firstArg ? `[${firstArg.toUpperCase()}]` : '',
            secondArg ? `[${secondArg.toUpperCase()}]` : '',
          )
        } else {
          finalTag += helper
        }
      } else {
        finalTag += `[${tag.toUpperCase()}]`
      }
    }
    return finalTag
  }

  get loggerTag() {
    return this.#tags.join('.')
  }
}

module.exports = { Logger }
