const fetchJson = require('./fetchJson')
const { Event } = require('../initialization')
const { log, HELPERS } = require('../logger')

module.exports = async function fetchRaids() {
  try {
    const pogoInfoResults = await fetchJson(
      'https://raw.githubusercontent.com/ccev/pogoinfo/v2/active/raids.json',
    )
    const raidsInfo = []
    Object.entries(pogoInfoResults).forEach((raidTier) => {
      const [egg, bosses] = raidTier
      raidsInfo.push(`e${egg}`, `r${egg}`)
      bosses.forEach((boss) =>
        raidsInfo.push(
          `${boss.id}-${
            boss.form || Event.masterfile.pokemon[boss.id]?.defaultFormId || 0
          }`,
        ),
      )
    })
    return raidsInfo
  } catch (e) {
    log.warn(HELPERS.fetch, 'Unable to fetch available raids from GitHub', e)
    return []
  }
}
