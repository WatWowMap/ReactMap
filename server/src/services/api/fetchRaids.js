/* eslint-disable no-console */
const fetchJson = require('./fetchJson')
const { Event } = require('../initialization')

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
    console.warn(e, '\nUnable to fetch available raids from GitHub')
    return []
  }
}
