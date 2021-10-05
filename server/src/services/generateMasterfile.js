/* eslint-disable no-console */
/* eslint-disable no-restricted-syntax */
const fs = require('fs')

const fetchJson = require('./api/fetchJson')
const defaultRarity = require('../data/defaultRarity.json')

const getRarityLevel = (id, pkmn) => {
  let adminRarity
  let rarity
  if (fs.existsSync('../configs/config.json')) {
    adminRarity = JSON.parse(fs.readFileSync('server/src/configs/config.json', 'utf8'))
  } else {
    adminRarity = JSON.parse(fs.readFileSync('server/src/configs/default.json', 'utf8'))
  }
  for (const [tier, pokemon] of Object.entries(defaultRarity)) {
    if (adminRarity.rarity[tier].length > 0) {
      if (adminRarity.rarity[tier].includes((parseInt(id)))) {
        rarity = tier
      }
    } else if (pokemon.includes(parseInt(id))) {
      rarity = tier
    }
  }
  if (pkmn.legendary) rarity = 'legendary'
  if (pkmn.mythical) rarity = 'mythical'
  return rarity
}

module.exports.generate = async function generate() {
  try {
    const masterfile = await fetchJson('https://raw.githubusercontent.com/WatWowMap/Masterfile-Generator/master/master-latest-react-map.json')

    Object.values(masterfile.pokemon).forEach(pokemon => {
      pokemon.rarity = getRarityLevel(pokemon.pokedexId, pokemon)
      pokemon.types = pokemon.types || []
      delete pokemon.mythical
      delete pokemon.legendary
    })

    fs.writeFile(
      'server/src/data/masterfile.json',
      JSON.stringify(masterfile, null, 2),
      'utf8',
      () => { },
    )
    console.log('New masterfile generated')
  } catch (e) {
    console.warn('Unable to generate new masterfile, using existing.')
  }
}
