/* eslint-disable no-console */
/* eslint-disable no-restricted-syntax */
const fs = require('fs')

const fetchJson = require('../src/services/api/fetchJson')
const defaultRarity = require('../src/data/defaultRarity.json')

const getRarityLevel = (id, pkmn) => {
  const adminRarity = fs.existsSync(`${__dirname}/../src/configs/local.json`)
    ? JSON.parse(fs.readFileSync(`${__dirname}/../src/configs/local.json`, 'utf8'))
    : JSON.parse(fs.readFileSync(`${__dirname}/../src/configs/default.json`, 'utf8'))
  let rarity
  for (const [tier, pokemon] of Object.entries(defaultRarity)) {
    if (adminRarity?.rarity?.[tier]?.length) {
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

const generate = async () => {
  try {
    const masterfile = await fetchJson('https://raw.githubusercontent.com/WatWowMap/Masterfile-Generator/master/master-latest-react-map.json')

    Object.values(masterfile.pokemon).forEach(pokemon => {
      pokemon.rarity = getRarityLevel(pokemon.pokedexId, pokemon)
      pokemon.types = pokemon.types || []
      delete pokemon.mythical
      delete pokemon.legendary
    })

    fs.writeFile(
      `${__dirname}/../src/data/masterfile.json`,
      JSON.stringify(masterfile, null, 2),
      'utf8',
      () => { },
    )
  } catch (e) {
    console.warn('Unable to generate new masterfile, using existing.', e)
  }
}

module.exports.generate = generate

if (require.main === module) {
  generate().then(() => console.log('Masterfile generated'))
}
