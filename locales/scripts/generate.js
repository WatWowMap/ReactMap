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
 * Recursively gets the sub json of a {@link I18nObject}
 * @param {I18nObject} node
 * @param {(n: Node) => Promise<string>} action
 * @returns {Promise<Node>}
 */
async function getSubJson(node, action) {
  if (estimateTokenCount(node) < 4096) {
    return action(node)
  }
  /** @type {I18nObject} */
  let nextObject = {}
  /** @type {I18nObject} */
  let pool = {}
  let poolSize = 0
  for (const key in node) {
    const nodeSize = estimateTokenCount(node[key])
    if (nodeSize + poolSize < 4096 * 0.8) {
      poolSize += nodeSize
      pool[key] = node[key]
      continue
    } else {
      const nextItem = await getSubJson(pool, action)
      nextObject = {
        ...nextObject,
        ...(typeof nextItem === 'string' ? JSON.parse(nextItem) : nextItem),
      }
      pool = { [key]: node[key] }
      poolSize = nodeSize
    }
  }
  return nextObject
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
 * @param {I18nObject} existing
 * @param {Node} newTranslations
 */
function saveResult(locale, localeFileName, existing, newTranslations) {
  try {
    const reactMapTranslations = { ...existing }
    const chatGptTranslations =
      typeof newTranslations === 'string'
        ? JSON.parse(newTranslations)
        : newTranslations

    log.info(
      HELPERS.locales,
      locale,
      'translated',
      Object.keys(chatGptTranslations).length,
      'keys',
    )

    Object.keys(chatGptTranslations).forEach((key) => {
      reactMapTranslations[key] = chatGptTranslations[key]
    })

    fs.writeFileSync(
      path.resolve(__dirname, '../', localeFileName),
      JSON.stringify(reactMapTranslations, null, 2),
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

    const reactMapTranslations = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '../', localeFileName), {
        encoding: 'utf8',
        flag: 'r',
      }),
    )
    /** @type {I18nObject} */
    const missingKeys = {}

    Object.keys(englishRef).forEach((key) => {
      if (!reactMapTranslations[key] && typeof englishRef[key] === 'string') {
        missingKeys[key] = englishRef[key]
      }
    })

    if (Object.keys(missingKeys).length === 0) continue

    try {
      const result = await getSubJson(missingKeys, async (node) => {
        const completion = await sendToGPT(locale, node)
        return matchJSON(`${completion.data.choices[0].message?.content}`)
      })
      saveResult(locale, localeFileName, reactMapTranslations, result)
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
