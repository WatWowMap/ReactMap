// @ts-check
const fs = require('fs')
const { resolve } = require('path')

const { default: fetch } = require('node-fetch')
const config = require('@rm/config')
const { log, TAGS } = require('@rm/logger')

const defaultRarity = require('./data/defaultRarity.json')

/** @type {import('.').generate} */
const generate = async (save = false, historicRarity = {}, dbRarity = {}) => {
  const rarityConfig = config.getSafe('rarity')
  const endpoint = config.getSafe('api.pogoApiEndpoints.masterfile')
  const rarityObj = {}

  Object.entries(defaultRarity).forEach(([tier, pokemon]) => {
    if (rarityConfig?.[tier]?.length) {
      rarityConfig[tier].forEach((mon) => (rarityObj[mon] = tier))
    } else {
      pokemon.forEach((mon) => (rarityObj[mon] = tier))
    }
  })

  log.info(TAGS.masterfile, 'generating masterfile')
  try {
    if (!endpoint) throw new Error('No masterfile endpoint')

    const masterfile = await fetch(endpoint).then((res) => res.json())

    const newMf = {
      ...masterfile,
      pokemon: Object.fromEntries(
        Object.values(masterfile.pokemon).map((pokemon) => {
          const { legendary, mythical, ultraBeast } = pokemon
          const historic =
            historicRarity[pokemon.pokedexId.toString()] || 'never'

          let rarity =
            (dbRarity.size
              ? dbRarity[`${pokemon.pokedexId}-${pokemon.defaultFormId}`]
              : rarityObj[pokemon.pokedexId]) || 'never'

          if (legendary) rarity = 'legendary'
          if (mythical) rarity = 'mythical'
          if (ultraBeast) rarity = 'ultraBeast'
          if (rarityObj[pokemon.pokedexId] === 'regional') rarity = 'regional'

          const forms = Object.fromEntries(
            Object.entries(pokemon.forms || {}).map(([formId, form]) => [
              formId,
              {
                ...form,
                rarity:
                  +formId === pokemon.defaultFormId
                    ? rarity
                    : dbRarity[`${pokemon.pokedexId}-${formId}`] || 'never',
              },
            ]),
          )

          return [pokemon.pokedexId, { ...pokemon, forms, rarity, historic }]
        }),
      ),
    }

    if (save) {
      await fs.promises.writeFile(
        resolve(`${__dirname}/data/masterfile.json`),
        JSON.stringify(newMf, null, 2),
        'utf8',
      )
    }

    return newMf
  } catch (e) {
    log.warn(
      TAGS.masterfile,
      'Unable to generate new masterfile, using existing.',
      e,
    )
  }
}

module.exports.generate = generate

if (require.main === module) {
  generate(true).then(() => log.info(TAGS.masterfile, 'OK'))
}

/** @type {import('.').read} */
const read = () => {
  try {
    return JSON.parse(
      fs.readFileSync(resolve(`${__dirname}/data/masterfile.json`), 'utf8'),
    )
  } catch {
    log.warn(
      TAGS.masterfile,
      'Unable to read masterfile, generating a new one for you now',
    )
    generate(true)
  }
}

module.exports.read = read
