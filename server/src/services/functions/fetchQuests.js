const fetchJson = require('./fetchJson')

module.exports = async function fetchQuests() {
  const quests = await fetchJson('https://raw.githubusercontent.com/ccev/pogoinfo/v2/active/quests.json')
  const grunts = await fetchJson('https://raw.githubusercontent.com/ccev/pogoinfo/v2/active/grunts.json')
  const questsInfo = []
  Object.values(quests).forEach(questType => {
    questType.forEach(task => {
      const megaAmount = task.task.includes('5') ? 10 : 20
      task.rewards.forEach(reward => {
        switch (reward.type) {
          default: questsInfo.push(`${reward.reward.id}-${reward.reward.form || 0}`); break
          case 'stardust': questsInfo.push(`d${reward.amount}`); break
          case 'item': questsInfo.push(`q${reward.id}`); break
          case 'energy': questsInfo.push(`m${reward.reward.id}-${megaAmount}`); break
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
}
