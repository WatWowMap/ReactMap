// @ts-check
// based off of https://github.com/ObservedObserver/chatgpt-i18n

/* eslint-disable no-continue */
/* eslint-disable guard-for-in */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */

require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { Configuration, OpenAIApi } = require('openai')

// TODO move this to its own internal package
const { log, HELPERS } = require('../../server/src/services/logger')

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
})
const openai = new OpenAIApi(configuration)

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
 * Saves the result to the locale file
 * @param {string} locale
 * @param {string} localeFileName
 * @param {Node} newTranslations
 */
function saveResult(locale, localeFileName, newTranslations) {
  try {
    const chatGptTranslations =
      typeof newTranslations === 'string'
        ? JSON.parse(newTranslations)
        : newTranslations

    log.info(HELPERS.locales, locale, 'translated successfully, saving to file')

    fs.writeFileSync(
      path.resolve(__dirname, '../', localeFileName),
      JSON.stringify(chatGptTranslations, null, 2),
      'utf8',
    )
  } catch (e) {
    log.error(HELPERS.locales, e, '\nFailed to save the result for', locale)
  }
}

/**
 * Sends the result to OpenAI gpt-3.5-turbo model
 * @param {string} locale
 * @param {Node} missingKeys
 * @returns
 */
async function sendToGPT(locale, missingKeys) {
  return openai.createChatCompletion({
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

async function getMissingLocales() {
  const locales = fs
    .readdirSync(path.resolve(__dirname, '../'))
    .filter((x) => x.endsWith('.json'))

  const englishRef = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '../', 'en.json'), {
      encoding: 'utf8',
      flag: 'r',
    }),
  )

  // maybe change to Promise.all in the future, but for now, lets keep it simple
  for (const localeFileName of locales) {
    const locale = localeFileName.replace('.json', '')
    if (locale === 'en') continue

    const localeTranslations = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '../', localeFileName), {
        encoding: 'utf8',
        flag: 'r',
      }),
    )
    /** @type {I18nObject} */
    const missingKeys = {}

    Object.keys(englishRef).forEach((key) => {
      if (!localeTranslations[key] && typeof englishRef[key] === 'string') {
        missingKeys[key] = englishRef[key]
      }
    })

    if (Object.keys(missingKeys).length === 0) continue

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
          const { content } = raw.data.choices[0].message
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
      const mergedJson = result.reduce(
        (acc, x) => ({ ...acc, ...x }),
        localeTranslations,
      )
      saveResult(locale, localeFileName, mergedJson)
    } catch (error) {
      log.error(HELPERS.locales, error)
    }
  }
}

module.exports.getMissingLocales = getMissingLocales

if (require.main === module) {
  getMissingLocales().then(() =>
    log.info(HELPERS.locales, 'AI has finished checking for missing locales'),
  )
}
