const fetchJson = require('./fetchJson')
const { pokemon: masterfile } = require('../../data/masterfile.json')

module.exports = async function fetchRaids() {
  try {
    const pogoInfoResults = await fetchJson('https://raw.githubusercontent.com/ccev/pogoinfo/v2/active/raids.json')
    const raidsInfo = []
    Object.entries(pogoInfoResults).forEach(raidTier => {
      const [egg, bosses] = raidTier
      raidsInfo.push(`e${egg}`)
      bosses.forEach(boss => raidsInfo.push(`${boss.id}-${boss.form || masterfile[boss.id].defaultFormId}`))
    })
    return raidsInfo
  } catch (e) {
    console.warn(e, '\nUnable to fetch available raids from GitHub')
    return []
  }
}
