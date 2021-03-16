import fs from 'fs' 
import axios from 'axios'

export default async function (icons) {
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
        });
        icon.pokemonList = availableForms
      }
    } else if (!Array.isArray(icon.pokemonList) || Date.now() - icon.lastRetrieved > 60 * 60 * 1000) try {
      const response = await axios({
        method: 'GET',
        url: icon.path + '/index.json',
        responseType: 'json'
      });
      icon.pokemonList = response ? response.data : []
      icon.lastRetrieved = Date.now()
    } catch (e) {
      console.warn(e)
    }
  }
}