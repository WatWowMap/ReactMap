import { getAllDevices } from './data/device.js'
import { getAllGyms } from './data/gym.js'
import { getAllPokestops } from './data/pokestop.js'
import { getAllPokemon } from './data/pokemon.js'
import { getAllSpawnpoints } from './data/spawnpoint.js'
import { getAllPortals } from './data/portal.js' 
import { getAllWeather } from './data/weather.js'
import { getAllS2Cells } from './data/s2Cell.js'
class Query {

  static getAllDevices() {
    return getAllDevices
  }

  static getAllGyms() {
    return getAllGyms
  }

  static getAllPokestops() {
    return getAllPokestops
  }

  static getAllPokemon() {
    return getAllPokemon
  }

  static getAllPortals() {
    return getAllPortals
  }

  static getAllS2Cells() {
    return getAllS2Cells
  }

  static getAllSpawnpoints() {
    return getAllSpawnpoints
  }

  static getAllWeather() {
    return getAllWeather
  }

}

export default Query