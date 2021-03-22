import getPokemonIcon from './functions/getPokemonIcon.js'
import getPolyVector from './functions/getPolyVector.js'

class Utility {

  static getPolyVector(s2cellId, type) {
    return getPolyVector(s2cellId, type)
  }

  static getPokemonIcon(availableForms, pokemonId, form, evolution, gender, costume, shiny) {
    return getPokemonIcon(availableForms, pokemonId, form, evolution, gender, costume, shiny)
  }

}

export default Utility