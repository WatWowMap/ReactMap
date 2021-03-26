import { Model, raw } from 'objection'

class Pokestop extends Model {
  static get tableName() {
    return 'pokestop'
  }

  static async getAvailableQuests() {
    const quests = {}
    quests.items = await this.query()
      .select('quest_item_id')
      .where('quest_reward_type', 2)
      .groupBy('quest_item_id')
    quests.pokemon = await this.query()
      .distinct('quest_pokemon_id')
      .select(raw('json_extract(json_extract(quest_rewards, "$[*].info.form_id"), "$[0]")')
        .as('form'))
      .where('quest_reward_type', 7)
    quests.mega = await this.query()
      .distinct(raw('json_extract(json_extract(quest_rewards, "$[*].info.pokemon_id"), "$[0]")')
        .as('id'))
      .where('quest_reward_type', 12)
    return quests
  }
}

export default Pokestop