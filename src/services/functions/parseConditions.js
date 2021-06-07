export default function parseQuestConditions(conditions) {
  const [type1, type2] = JSON.parse(conditions)
  const conditionsToReturn = []

  const parseMadRewards = specifics => {
    const normalized = {
      type: specifics.type,
      info: {},
    }
    switch (specifics.type) {
      default: return undefined
      case 1: normalized.info.pokemon_type_ids = specifics.with_pokemon_type.pokemon_type; break
      case 2: normalized.info.pokemon_ids = specifics.with_pokemon_category.pokemon_ids; break
      case 7: normalized.info.raid_levels = specifics.with_raid_level.raid_level; break
      case 8:
      case 14:
      case 26: normalized.info.throw_type_id = specifics.with_throw_type.throw_type; break
      case 27: normalized.info.character_category_ids = specifics.with_invasion_character.category; break
    }
  }
  if (type1) {
    if (type1.info) {
      conditionsToReturn.push(type1)
    } else {
      parseMadRewards(type1)
    }
  }
  if (type2) {
    if (type2.info) {
      conditionsToReturn.push(type2)
    } else {
      parseMadRewards(type2)
    }
  }
  return conditionsToReturn
}
