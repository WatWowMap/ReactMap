import fetchGyms from './data/gyms.js'
import fetchPokestops from './data/pokestops.js'
import fetchPokemon from './data/pokemon.js' 
import fetchSettings from './data/settings.js' 

class Fetch {

  static async fetchSettings() {
    return await fetchSettings()
  }

  static async fetchGyms(bounds) {
    return await fetchGyms(bounds)
  }

  static async fetchPokestops(bounds) {
    return await fetchPokestops(bounds)
  }

  static async fetchPokemon(bounds) {
    return await fetchPokemon(bounds)
  }

}

export default Fetch