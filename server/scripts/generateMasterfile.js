const fs = require('fs')
const { resolve } = require('path')
const { rarity: customRarity } = require('../src/services/config')
const fetchJson = require('../src/services/api/fetchJson')
const defaultRarity = require('../src/data/defaultRarity.json')

const rarityObj = {}
Object.entries(defaultRarity).forEach(([tier, pokemon]) => {
  if (customRarity?.[tier]?.length) {
    customRarity[tier].forEach((mon) => (rarityObj[mon] = tier))
  } else {
    pokemon.forEach((mon) => (rarityObj[mon] = tier))
  }
})

const generate = async (
  save = false,
  historicRarity = new Map(),
  dbRarity = new Map(),
) => {
  try {
    const masterfile = await fetchJson(
      'https://raw.githubusercontent.com/WatWowMap/Masterfile-Generator/master/master-latest-react-map.json',
    )

    const newMf = {
      ...masterfile,
      pokemon: Object.fromEntries(
        Object.values(masterfile.pokemon).map((pokemon) => {
          const { legendary, mythical, ultraBeast, ...rest } = pokemon
          const historic = historicRarity.get(pokemon.pokedexId) || 'never'

          let rarity =
            (dbRarity.size
              ? dbRarity.get(`${pokemon.pokedexId}-${pokemon.defaultFormId}`)
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
                    : dbRarity.get(`${pokemon.pokedexId}-${formId}`) || 'never',
              },
            ]),
          )
          return [pokemon.pokedexId, { ...rest, forms, rarity, historic }]
        }),
      ),
    }

    if (save) {
      fs.writeFileSync(
        resolve(`${__dirname}/../src/data/masterfile.json`),
        JSON.stringify(newMf, null, 2),
        'utf8',
        () => {},
      )
    }
    return newMf
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[WARN] Unable to generate new masterfile, using existing.', e)
  }
}

module.exports.generate = generate

if (require.main === module) {
  // eslint-disable-next-line no-console
  generate(true).then(() => console.log('Masterfile generated'))
}
