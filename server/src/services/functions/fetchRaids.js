const fetchJson = require('./fetchJson')

module.exports = async function fetchRaids() {
  const pogoInfoResults = await fetchJson('https://raw.githubusercontent.com/ccev/pogoinfo/v2/active/raids.json')
  const raidsInfo = []
  Object.entries(pogoInfoResults).forEach(raidTier => {
    const [egg, bosses] = raidTier
    raidsInfo.push(`e${egg}`)
    bosses.forEach(boss => raidsInfo.push(`${boss.id}-${boss.form || 0}`))
  })
  return raidsInfo
}
