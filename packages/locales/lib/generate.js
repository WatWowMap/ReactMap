/* eslint-disable prefer-template */
// @ts-check
/* eslint-disable no-restricted-syntax */
/* eslint-disable guard-for-in */

require('dotenv').config()
const { OpenAI } = require('openai')
const { encode } = require('gpt-tokenizer')

const { log, HELPERS } = require('@rm/logger')

const { readAndParseJson, readLocaleDirectory, writeAll } = require('./utils')

const openAI = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null

const TOKEN_LIMIT = 1024

/**
 * @typedef {Record<string, string>} I18nObject
 * @typedef {I18nObject | string} Node
 */

/**
 * Splits the json into token chunks
 * @param {I18nObject} json
 * @returns {I18nObject[]}
 */
function splitJson(json) {
  /** @type {I18nObject[]} */
  const chunks = []
  /** @type {I18nObject} */
  let currentChunk = {}
  let currentTokenCount = 2

  for (const [key, value] of Object.entries(json)) {
    const string = `  "${key}": ${
      typeof value === 'string'
        ? `"${value}"`
        : typeof value === 'number'
        ? value
        : `${value}`
    },\n`
    const newLineCount = (string.match(/\n/g) || []).length - 1
    const tokenCount = encode(string).length
    const totalTokenCount = tokenCount + newLineCount

    if (currentTokenCount + totalTokenCount >= TOKEN_LIMIT) {
      chunks.push(currentChunk)
      currentChunk = {}
      currentTokenCount = 2
    }
    currentChunk[key] = value
    currentTokenCount =
      newLineCount > 0
        ? encode(JSON.stringify(currentChunk, null, 2)).length
        : currentTokenCount + totalTokenCount
  }
  if (Object.keys(currentChunk).length > 0) chunks.push(currentChunk)
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
 * Sends the result to OpenAI gpt-4-turbo model
 * @param {string} locale
 * @param {Node} missingKeys
 * @returns
 */
async function sendToGPT(locale, missingKeys) {
  return openAI.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      {
        role: 'system',
        content: `Translate an i18n English locale json content to ${locale}. It's a key-value structure, don't translate the key. Consider the context of all of the values together to make better translation. All translations should be related to a Pokemon GO context. Ensure that all key value pairs are matched correctly.`,
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
          Object.entries(englishRef).filter(
            ([key]) =>
              !(key in merged) &&
              !key.startsWith('locale_selection_') &&
              typeof englishRef[key] !== 'number',
          ),
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
                  reason: raw.choices[0].finish_reason,
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
  if (!process.env.OPENAI_API_KEY) throw new Error('OpenAI API key is missing')
  generate()
    .then((locales) => writeAll(locales, false, __dirname, './generated'))
    .then(() =>
      log.info(HELPERS.locales, 'ai has finished checking for missing locales'),
    )
}
