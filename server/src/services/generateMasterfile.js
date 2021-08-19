/* eslint-disable no-restricted-syntax */
const fs = require('fs')

const { rarity: adminRarity } = require('./config')
const fetchJson = require('./functions/fetchJson')
const defaultRarity = require('../data/defaultRarity.json')

const getRarityLevel = (id, pkmn) => {
  let rarity
  for (const [tier, pokemon] of Object.entries(defaultRarity)) {
    if (adminRarity[tier].length > 0) {
      if (adminRarity[tier].includes((parseInt(id)))) {
        rarity = tier
      }
    } else if (pokemon.includes(parseInt(id))) {
      rarity = tier
    }
  }
  if (pkmn.legendary) rarity = 'legendary'
  if (pkmn.mythic) rarity = 'mythical'
  return rarity
}

module.exports.generate = async function generate() {
  try {
    const masterfile = await fetchJson('https://raw.githubusercontent.com/WatWowMap/Masterfile-Generator/master/master-latest-react-map.json')

    Object.values(masterfile.pokemon).forEach(pokemon => pokemon.rarity = getRarityLevel(pokemon.id, pokemon))

    fs.writeFile(
      './server/src/data/masterfile.json',
      JSON.stringify(masterfile, null, 2),
      'utf8',
      () => { },
    )
    console.log('New masterfile generated')
  } catch (e) {
    console.warn('Unable to generate new masterfile, using existing.')
  }
}
