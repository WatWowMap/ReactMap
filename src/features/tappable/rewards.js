// @ts-check

// Golbat's reward_type is the LootItemProto field name, not a quest reward type;
// the quest reward type is only used to pick the reward icon
const TAPPABLE_REWARDS = Object.freeze({
  item: { prefix: 'q', questRewardType: 2, idKey: 'item_id' },
  pokemon_candy: {
    prefix: 'c',
    questRewardType: 4,
    idKey: 'reward_pokemon_id',
  },
  xl_candy: { prefix: 'x', questRewardType: 9, idKey: 'reward_pokemon_id' },
  mega_energy_pokemon_id: {
    prefix: 'm',
    questRewardType: 12,
    idKey: 'reward_pokemon_id',
  },
  temp_evo_pokemon_branch: {
    prefix: 'm',
    questRewardType: 12,
    idKey: 'reward_pokemon_id',
  },
})

/**
 * Resolves the filter key and icon reward type of a tappable's reward.
 * Rows from databases without `reward_type` are always item rewards.
 * @param {Partial<import('@rm/types').Tappable>} tappable
 * @returns {{ filterKey: string, questRewardType: number, id: number } | null}
 */
export function getTappableReward(tappable) {
  const reward = TAPPABLE_REWARDS[tappable?.reward_type || 'item']
  const id = reward && tappable[reward.idKey]
  if (!id) return null
  return {
    filterKey: `${reward.prefix}${id}`,
    questRewardType: reward.questRewardType,
    id,
  }
}

const QUEST_REWARD_TYPES = Object.freeze(
  Object.fromEntries(
    Object.values(TAPPABLE_REWARDS).map(({ prefix, questRewardType }) => [
      prefix,
      questRewardType,
    ]),
  ),
)

/**
 * Resolves a tappable filter key such as `c25` back to its reward.
 * @param {string} filterKey
 * @returns {{ filterKey: string, questRewardType: number, id: number } | null}
 */
export function getTappableRewardFromKey(filterKey) {
  const questRewardType = QUEST_REWARD_TYPES[filterKey.charAt(0)]
  const id = Number(filterKey.slice(1))
  if (!questRewardType || !id) return null
  return { filterKey, questRewardType, id }
}

/**
 * @param {{ questRewardType: number, id: number }} reward
 * @param {import('i18next').TFunction} t
 * @returns {string}
 */
export function getTappableRewardName(reward, t) {
  switch (reward.questRewardType) {
    case 4:
      return `${t(`poke_${reward.id}`)} ${t('candy')}`
    case 9:
      return `${t(`poke_${reward.id}`)} ${t('xl')}`
    case 12:
      return `${t(`poke_${reward.id}`)} ${t('quest_reward_12')}`
    default:
      return t(`item_${reward.id}`)
  }
}
