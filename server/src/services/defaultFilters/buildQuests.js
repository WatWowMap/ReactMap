const { GenericFilter } = require('../../models/index')

module.exports = function buildQuests(perms, availableQuests, defaults) {
  const quests = perms ? {} : undefined

  if (quests) {
    Object.entries(availableQuests).forEach(questType => {
      const [type, rewards] = questType
      switch (type) {
        default:
          rewards.forEach(reward => {
            quests[`p${reward.quest_pokemon_id}-${reward.form}`] = new GenericFilter(defaults.pokemon)
          }); break
        case 'items':
          rewards.forEach(reward => {
            quests[`q${reward.quest_item_id}`] = new GenericFilter(defaults.items)
          }); break
        case 'mega':
          rewards.forEach(reward => {
            quests[`m${reward.id}`] = new GenericFilter(defaults.megaEnergy)
          }); break
        case 'invasions':
          rewards.forEach(reward => {
            quests[`i${reward.grunt_type}`] = new GenericFilter(defaults.invasions)
          })
      }
    })
  }
  return quests
}
