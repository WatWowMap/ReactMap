const fetchJson = require('./fetchJson')
const {
  api: { nestHemisphere },
} = require('../config')
const { Event } = require('../initialization')
const { log, HELPERS } = require('../logger')

module.exports = async function fetchNests() {
  try {
    const { [nestHemisphere]: nesting } = await fetchJson(
      'https://raw.githubusercontent.com/ccev/pogoinfo/v2/nests/species-ids.json',
    )
    return nesting.map(
      (pokemon) =>
        `${pokemon}-${Event.masterfile.pokemon[pokemon].defaultFormId}`,
    )
  } catch (e) {
    log.warn(HELPERS.fetch, 'Unable to fetch available nests from GitHub', e)
    return []
  }
}
