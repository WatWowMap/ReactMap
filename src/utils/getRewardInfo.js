// @ts-check

import { useMemory } from '@store/useMemory'

/**
 * @param {Partial<import("@rm/types").Quest>} quest
 * @param {{ preferAmountIcon?: boolean }} [options]
 */
export function getRewardInfo(
  {
    quest_pokemon_id,
    quest_form_id,
    quest_gender_id,
    quest_costume_id,
    quest_bread_mode = 0,
    quest_shiny,
    quest_item_id,
    item_amount,
    stardust_amount,
    candy_amount,
    xl_candy_amount,
    xp_amount,
    mega_pokemon_id,
    mega_amount,
    candy_pokemon_id,
    xl_candy_pokemon_id,
    quest_reward_type,
    quest_reward_amount,
  },
  { preferAmountIcon = false } = {},
) {
  const { Icons } = useMemory.getState()
  let src = ''
  let amount = 0
  let tt = /** @type {string[] | string} */ ('')
  const parsedRewardAmount = Number(
    {
      1: xp_amount,
      2: item_amount,
      3: stardust_amount,
      4: candy_amount,
      9: xl_candy_amount,
      12: mega_amount,
    }[quest_reward_type] ??
      quest_reward_amount ??
      0,
  )
  const rewardAmount =
    Number.isFinite(parsedRewardAmount) && parsedRewardAmount > 0
      ? parsedRewardAmount
      : 0

  switch (quest_reward_type) {
    case 1:
      tt = `quest_reward_${quest_reward_type}`
      src = Icons.getRewards(quest_reward_type, xp_amount)
      amount = src.includes('/0.') ? rewardAmount : 0
      break
    case 2:
      tt = `item_${quest_item_id}`
      src = Icons.getRewards(quest_reward_type, quest_item_id, item_amount)
      amount = src.includes('_a') || rewardAmount <= 1 ? 0 : rewardAmount
      break
    case 3:
      tt = `quest_reward_3`
      src = Icons.getRewards(quest_reward_type, stardust_amount)
      amount = src.includes('/0.') ? rewardAmount : 0
      break
    case 4:
      tt = `poke_${candy_pokemon_id}`
      src = Icons.getRewards(
        quest_reward_type,
        candy_pokemon_id,
        preferAmountIcon ? rewardAmount : 0,
      )
      amount = src.includes('_a') ? 0 : rewardAmount
      break
    case 7:
      tt = [
        quest_form_id ? `form_${quest_form_id}` : '',
        `poke_${quest_pokemon_id}`,
      ]
      src = Icons.getPokemon(
        quest_pokemon_id,
        quest_form_id,
        0,
        quest_gender_id,
        quest_costume_id,
        0,
        !!quest_shiny,
        quest_bread_mode,
      )
      break
    case 8:
      tt = `quest_reward_${quest_reward_type}`
      src = Icons.getRewards(quest_reward_type, rewardAmount)
      amount = rewardAmount > 1 && src.includes('/0.') ? rewardAmount : 0
      break
    case 9:
      tt = `poke_${xl_candy_pokemon_id}`
      src = Icons.getRewards(
        quest_reward_type,
        xl_candy_pokemon_id,
        preferAmountIcon ? rewardAmount : 0,
      )
      amount = src.includes('_a') ? 0 : rewardAmount
      break
    case 12:
      tt = `poke_${mega_pokemon_id}`
      src = Icons.getRewards(quest_reward_type, mega_pokemon_id, mega_amount)
      amount = src.includes('_a') ? 0 : rewardAmount
      break
    default:
      tt = `quest_reward_${quest_reward_type}`
      src = Icons.getRewards(quest_reward_type)
      amount = src.includes('_a') || rewardAmount <= 1 ? 0 : rewardAmount
  }
  return { src, tt, amount, rewardAmount }
}
