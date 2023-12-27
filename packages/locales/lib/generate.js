// @ts-check
/* eslint-disable no-restricted-syntax */
/* eslint-disable guard-for-in */

require('dotenv').config()
const { OpenAI } = require('openai')

const { log, HELPERS } = require('@rm/logger')

const { readAndParseJson, readLocaleDirectory, writeAll } = require('./utils')

const openAI = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null

/**
 * @typedef {Record<string, string>} I18nObject
 * @typedef {I18nObject | string} Node
 */

/**
 * Recursively estimates the token size of a {@link Node}
 * @param {Node} content
 * @returns {number}
 */
function estimateTokenCount(content) {
  if (typeof content === 'string') {
    return content.split(/[\s.'_A-Z0-9]/).length * 2
  }
  if (typeof content === 'object') {
    let count = 0
    for (const key in content) {
      count += estimateTokenCount(content[key])
      count += key.split(/[_A-Z0-9]/).length * 2
    }
    return count
  }
  return 1
}

/**
 * Splits the json into 2048 token chunks
 * @param {I18nObject} json
 * @returns {I18nObject[]}
 */
function splitJson(json) {
  /** @type {I18nObject[]} */
  const chunks = []
  /** @type {I18nObject} */
  let pool = {}
  let poolSize = 0
  for (const key in json) {
    const nodeSize = estimateTokenCount(json[key]) + estimateTokenCount(key)
    if (nodeSize + poolSize < 2048) {
      poolSize += nodeSize
      pool[key] = json[key]
    } else {
      chunks.push(pool)
      pool = { [key]: json[key] }
      poolSize = nodeSize
    }
  }
  if (Object.keys(pool).length > 0) {
    chunks.push(pool)
  }
  return chunks
}

/**
 * Matches the JSON string from the OpenAI response
 * @param {string} str
 * @returns
 */
function matchJSON(str) {
  let start = 0
  let end = 0
  const stack = []
  for (let i = 0; i < str.length; i += 1) {
    if (str[i] === '{') {
      if (stack.length === 0) {
        start = i
      }
      stack.push('{')
    }
    if (str[i] === '}') {
      stack.pop()
      if (stack.length === 0) {
        end = i
        break
      }
    }
  }
  return str.slice(start, end + 1)
}

/**
 * Sends the result to OpenAI gpt-3.5-turbo model
 * @param {string} locale
 * @param {Node} missingKeys
 * @returns
 */
async function sendToGPT(locale, missingKeys) {
  return openAI.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'system',
        content: `Translate an i18n locale json content to ${locale}. It's a key-value structure, don't translate the key. Consider the context of all of the values together to make better translation. All translations should be related to a Pokemon GO context.`,
      },
      {
        role: 'user',
        content:
          typeof missingKeys === 'string'
            ? missingKeys
            : JSON.stringify(missingKeys),
      },
    ],
  })
}

/**
 * Generates the missing locales using OpenAI, returns { [locale]: {@link I18nObject} }
 * @returns {Promise<Record<string, Record<string, string>>>}
 */
async function generate() {
  const locales = readLocaleDirectory(false)

  const englishRef = await readAndParseJson('en.json', true)

  const translations = await Promise.allSettled(
    locales
      .filter((fileName) => fileName !== 'en.json')
      .map(async (fileName) => {
        const locale = fileName.replace('.json', '')
        const generated = await readAndParseJson(fileName, false)
        const manual = await readAndParseJson(fileName, true)
        const merged = { ...generated, ...manual }

        /** @type {I18nObject} */
        const missingKeys = Object.fromEntries(
          Object.entries(englishRef).filter(([key]) => !(key in merged)),
        )

        if (Object.keys(missingKeys).length === 0) return

        try {
          const chunks = splitJson(missingKeys)
          log.info(
            HELPERS.locales,
            locale,
            'making',
            chunks.length,
            'requests to OpenAI',
          )
          /** @type {I18nObject[]} */
          const result = await Promise.all(
            chunks.map(async (x) => {
              const raw = await sendToGPT(locale, x)
              const { content } = raw.choices[0].message
              const clean = matchJSON(`${content}`)
              try {
                return JSON.parse(clean)
              } catch (e) {
                log.error(e, '\nUnable to parse returned translations\n', {
                  locale,
                  content,
                  clean,
                })
                return {}
              }
            }),
          )
          return [locale, result.reduce((acc, x) => ({ ...acc, ...x }), merged)]
        } catch (error) {
          log.error(HELPERS.locales, error)
        }
      }),
  )

  return Object.fromEntries(
    translations
      .map((locale) => locale.status === 'fulfilled' && locale.value)
      .filter(Boolean),
  )
}

module.exports.generate = generate

if (require.main === module) {
  generate()
    .then((locales) => writeAll(locales, false, __dirname, './generated'))
    .then(() =>
      log.info(HELPERS.locales, 'ai has finished checking for missing locales'),
    )
}
