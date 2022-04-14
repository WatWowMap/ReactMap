export default function parseQuestConditions(conditions) {
  const [type1, type2] = JSON.parse(conditions)
  const conditionsToReturn = []
  const parseMadRewards = specifics => {
    const normalized = {
      type: specifics.type,
      info: {},
    }
    switch (specifics.type) {
      case 1: normalized.info.pokemon_type_ids = specifics.with_pokemon_type.pokemon_type; break
      case 2: normalized.info.pokemon_ids = specifics.with_pokemon_category.pokemon_ids; break
      case 7: normalized.info.raid_levels = specifics.with_raid_level.raid_level; break
      case 11: normalized.info.item_id = specifics.with_item.item; break
      case 8:
      case 14: normalized.info.throw_type_id = specifics.with_throw_type.throw_type; break
      case 26: normalized.info.alignment_ids = specifics.with_pokemon_alignment.alignment; break
      case 27: normalized.info.character_category_ids = specifics.with_invasion_character.category; break
      case 44: normalized.info.time = specifics.with_elapsed_time.elapsed_time / 1000; break
      default: break
    }
    return normalized
  }
  if (type1) {
    if (type1.info) {
      conditionsToReturn.push(type1)
    } else {
      conditionsToReturn.push(parseMadRewards(type1))
    }
  }
  if (type2) {
    if (type2.info) {
      conditionsToReturn.push(type2)
    } else {
      conditionsToReturn.push(parseMadRewards(type2))
    }
  }
  return conditionsToReturn
}
