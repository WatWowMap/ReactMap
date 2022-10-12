/* eslint-disable no-console */
const fetchJson = require('./fetchJson')
const { Event } = require('../initialization')

module.exports = async function fetchQuests() {
  try {
    const quests = await fetchJson(
      'https://raw.githubusercontent.com/ReuschelCGN/pogoinfo/v2/active/quests.json',
    )
    const grunts = await fetchJson(
      'https://raw.githubusercontent.com/ReuschelCGN/pogoinfo/v2/active/grunts.json',
    )
    const questsInfo = []
    Object.values(quests).forEach((questType) => {
      questType.forEach((task) => {
        task.rewards.forEach((reward) => {
          switch (reward.type) {
            case 'stardust':
              questsInfo.push(`d${reward.amount}`)
              break
            case 'item':
              questsInfo.push(`q${reward.id}`)
              break
            case 'energy':
              questsInfo.push(`m${reward.reward.id}-${reward.amount}`)
              break
            default:
              questsInfo.push(
                `${reward.reward.id}-${
                  reward.reward.form ||
                  Event.masterfile.pokemon[reward.reward.id].defaultFormId
                }`,
              )
              break
          }
        })
      })
    })
    Object.keys(grunts).forEach((grunt) => {
      if (grunts[grunt].active) {
        questsInfo.push(`i${grunt}`)
      }
    })
    for (let i = 1; i <= 5; i += 1) {
      questsInfo.push(`l50${i}`)
    }
    return questsInfo
  } catch (e) {
    console.warn(
      e,
      '\nUnable to fetch available quests and invasions from GitHub',
    )
    return []
  }
}
