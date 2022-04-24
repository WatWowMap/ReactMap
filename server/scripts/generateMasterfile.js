/* eslint-disable no-console */
/* eslint-disable no-restricted-syntax */
const fs = require('fs')
const path = require('path')
const { rarity } = require('../src/services/config')
const fetchJson = require('../src/services/api/fetchJson')
const defaultRarity = require('../src/data/defaultRarity.json')

const getRarityLevel = (id, pkmn) => {
  let pkmnRarity
  for (const [tier, pokemon] of Object.entries(defaultRarity)) {
    if (rarity?.[tier]?.length) {
      if (rarity[tier].includes((parseInt(id)))) {
        pkmnRarity = tier
      }
    } else if (pokemon.includes(parseInt(id))) {
      pkmnRarity = tier
    }
  }
  if (pkmn.legendary) pkmnRarity = 'legendary'
  if (pkmn.mythical) pkmnRarity = 'mythical'
  return pkmnRarity
}

const generate = async (save) => {
  try {
    const masterfile = await fetchJson('https://raw.githubusercontent.com/WatWowMap/Masterfile-Generator/master/master-latest-react-map.json')

    Object.values(masterfile.pokemon).forEach(pokemon => {
      pokemon.rarity = getRarityLevel(pokemon.pokedexId, pokemon)
      pokemon.types = pokemon.types || []
      delete pokemon.mythical
      delete pokemon.legendary
    })

    if (save) {
      fs.writeFileSync(
        path.resolve(`${__dirname}/../src/data/masterfile.json`),
        JSON.stringify(masterfile, null, 2),
        'utf8',
        () => { },
      )
    }
    return masterfile
  } catch (e) {
    console.warn('[WARN] Unable to generate new masterfile, using existing.', e)
  }
}

module.exports.generate = generate

if (require.main === module) {
  generate(true).then(() => console.log('Masterfile generated'))
}
