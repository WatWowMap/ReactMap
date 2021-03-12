import { getAllGyms } from './data/gym.js'
import { getAllPokestops } from './data/pokestop.js'
import { getAllPokemon } from './data/pokemon.js'

class Query {

  static getAllGyms() {
    return getAllGyms
  }

  static getAllPokestops() {
    return getAllPokestops
  }

  static getAllPokemon() {
    return getAllPokemon
  }

}

export default Query