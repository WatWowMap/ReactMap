const { GenericFilter, Pokestop } = require('../../models/index')

module.exports = async function buildQuests(perms, defaults) {
  const quests = perms ? {} : undefined
  if (quests) {
    const availableQuests = await Pokestop.getAvailableQuests()
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
            quests[`m${reward.id}-${reward.amount}`] = new GenericFilter(defaults.megaEnergy)
          }); break
        case 'invasions':
          rewards.forEach(reward => {
            quests[`i${reward.grunt_type}`] = new GenericFilter(defaults.allInvasions)
          }); break
        case 'stardust':
          rewards.forEach(reward => {
            quests[`d${reward.amount}`] = new GenericFilter(defaults.items)
          }); break
      }
    })
  }
  return quests
}
