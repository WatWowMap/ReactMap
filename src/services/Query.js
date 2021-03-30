import getAllDevices from './data/device'
import { getAllGyms, getAllRaids } from './data/gym'
import getAllPokestops from './data/pokestop'
import getAllPokemon from './data/pokemon'
import getAllSpawnpoints from './data/spawnpoint'
import getAllPortals from './data/portal'
import getAllWeather from './data/weather'
import getAllS2Cells from './data/s2Cell'
import getAllSubmissionCells from './data/submissionCells'

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

  static getAllRaids() {
    return getAllRaids
  }

  static getAllS2Cells() {
    return getAllS2Cells
  }

  static getAllSpawnpoints() {
    return getAllSpawnpoints
  }

  static getAllSubmissionCells() {
    return getAllSubmissionCells
  }

  static getAllWeather() {
    return getAllWeather
  }
}

export default Query
