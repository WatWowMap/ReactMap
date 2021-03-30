export default function buildQuests(availableQuests) {
  const quests = {}
  Object.entries(availableQuests).forEach(questType => {
    if (questType[0] === 'items') {
      questType[1].forEach(reward => {
        quests[`q${reward.quest_item_id}`] = { enabled: true, size: 'md' }
      })
    } else if (questType[0] === 'pokemon') {
      questType[1].forEach(reward => {
        quests[`p${reward.quest_pokemon_id}-${reward.form}`] = { enabled: true, size: 'md' }
      })
    } else {
      questType[1].forEach(reward => {
        quests[`m${reward.id}`] = { enabled: true, size: 'md' }
      })
    }
  })

  return quests
}
