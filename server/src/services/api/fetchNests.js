/* eslint-disable no-console */
const fetchJson = require('./fetchJson')
const { api: { nestHemisphere } } = require('../config')
const {
  Event: { masterfile: { pokemon: masterfile } },
} = require('../initialization')

module.exports = async function fetchNests() {
  try {
    const { [nestHemisphere]: nesting } = await fetchJson('https://raw.githubusercontent.com/ccev/pogoinfo/v2/nests/species-ids.json')
    return nesting.map(pokemon => `${pokemon}-${masterfile[pokemon].defaultFormId}`)
  } catch (e) {
    console.warn(e, '\nUnable to fetch available nests from GitHub')
    return []
  }
}
