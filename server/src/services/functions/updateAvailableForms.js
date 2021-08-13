/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-console */
const fs = require('fs')
const path = require('path')
const fetch = require('./fetchJson')

const modifiers = {
  offsetX: 0,
  offsetY: 0,
  sizeMultiplier: 0,
}

module.exports = async function updateAvailableForms(icons) {
  for (const icon of Object.values(icons)) {
    if (icon.path.startsWith('/')) {
      const pokemonIconsDir = path.resolve(__dirname, `../../static${icon.path}`)
      const files = await fs.promises.readdir(pokemonIconsDir)
      if (files) {
        const availableForms = []
        files.forEach(file => {
          const match = /^(.+)\.png$/.exec(file)
          if (match !== null) {
            availableForms.push(match[1])
          }
        })
        icon.pokemonList = availableForms
      }
    } else {
      try {
        const indexes = await fetch(`${icon.path}/index.json`)
        icon.indexes = Object.keys(indexes)
        icon.indexes.forEach(category => {
          if (!parseInt(category) && category !== '0') {
            icon[category] = { available: indexes[category] }
            icon[category].modifiers = icon.modifiers ? icon.modifiers[category] || modifiers : modifiers
          }
        })
        // icon.pokemon = uIcons ? new Set(uIcons.pokemon) : []
        // icon.gyms = {
        //   gym: uIcons ? new Set(uIcons.gym) : [],
        //   egg: uIcons ? new Set(uIcons.raid.egg) : [],
        //   team: uIcons ? new Set(uIcons.team) : [],
        // }
        // icon.pokestops = {
        //   pokestop: uIcons ? new Set(uIcons.pokestop) : [],
        //   item: uIcons ? new Set(uIcons.reward.item) : [],
        //   stardust: uIcons ? new Set(uIcons.reward.stardust) : [],
        //   candy: uIcons ? new Set(uIcons.reward.candy) : [],
        //   xlCandy: uIcons ? new Set(uIcons.reward.xl_candy) : [],
        //   megaEnergy: uIcons ? new Set(uIcons.reward.mega_resource) : [],
        //   invasion: uIcons ? new Set(uIcons.invasion) : [],
        // }
        // icon.weather = uIcons ? new Set(uIcons.weather) : []
      } catch (e) {
        console.warn(e)
      }
    }
  }
}
