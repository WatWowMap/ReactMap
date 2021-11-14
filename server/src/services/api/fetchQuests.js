const fetchJson = require('./fetchJson')
const { pokemon: masterfile } = require('../../data/masterfile.json')

module.exports = async function fetchQuests() {
  try {
    const quests = await fetchJson('https://raw.githubusercontent.com/ccev/pogoinfo/v2/active/quests.json')
    const grunts = await fetchJson('https://raw.githubusercontent.com/ccev/pogoinfo/v2/active/grunts.json')
    const questsInfo = []
    Object.values(quests).forEach(questType => {
      questType.forEach(task => {
        task.rewards.forEach(reward => {
          switch (reward.type) {
            default: questsInfo.push(`${reward.reward.id}-${reward.reward.form || masterfile[reward.reward.id].defaultFormId}`); break
            case 'stardust': questsInfo.push(`d${reward.amount}`); break
            case 'item': questsInfo.push(`q${reward.id}`); break
            case 'energy': questsInfo.push(`m${reward.reward.id}-${reward.amount}`); break
          }
        })
      })
    })
    Object.keys(grunts).forEach(grunt => {
      if (grunts[grunt].active) {
        questsInfo.push(`i${grunt}`)
      }
    })
    return questsInfo
  } catch (e) {
    console.warn(e, '\nUnable to fetch available quests and invasions from GitHub')
    return []
  }
}
