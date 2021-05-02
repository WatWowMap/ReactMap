const { GenericFilter } = require('../../models/index')

module.exports = function buildQuests(perms, availableQuests) {
  const quests = perms ? {} : undefined

  if (quests) {
    Object.entries(availableQuests).forEach(questType => {
      const [type, rewards] = questType

      switch (type) {
        default:
          rewards.forEach(reward => {
            quests[`p${reward.quest_pokemon_id}-${reward.form}`] = new GenericFilter()
          }); break
        case 'items':
          rewards.forEach(reward => {
            quests[`q${reward.quest_item_id}`] = new GenericFilter()
          }); break
        case 'mega':
          rewards.forEach(reward => {
            quests[`m${reward.id}`] = new GenericFilter()
          }); break
      }
    })
  }

  return quests
}
