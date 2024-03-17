// @ts-check

import { useMemory } from '@store/useMemory'

/** @param {Partial<import("@rm/types").Quest>} quest */
export function getRewardInfo({
  quest_pokemon_id,
  quest_form_id,
  quest_gender_id,
  quest_costume_id,
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
}) {
  const { Icons } = useMemory.getState()
  let src = ''
  let amount = 0
  let tt = /** @type {string[] | string} */ ('')

  switch (quest_reward_type) {
    case 1:
      tt = `quest_reward_${quest_reward_type}`
      src = Icons.getRewards(quest_reward_type, xp_amount)
      amount = src.includes('/0.') ? xp_amount : 0
      break
    case 2:
      tt = `item_${quest_item_id}`
      src = Icons.getRewards(quest_reward_type, quest_item_id, item_amount)
      amount = src.includes('_a') || item_amount <= 1 ? 0 : item_amount
      break
    case 3:
      tt = `quest_reward_3`
      src = Icons.getRewards(quest_reward_type, stardust_amount)
      amount = src.includes('/0.') ? stardust_amount : 0
      break
    case 4:
      tt = `poke_${candy_pokemon_id}`
      src = Icons.getRewards(quest_reward_type, candy_pokemon_id)
      amount = src.includes('_a') ? 0 : candy_amount
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
      )
      break
    case 9:
      tt = `poke_${xl_candy_pokemon_id}`
      src = Icons.getRewards(quest_reward_type, xl_candy_pokemon_id)
      amount = src.includes('_a') ? 0 : xl_candy_amount
      break
    case 12:
      tt = `poke_${mega_pokemon_id}`
      src = Icons.getRewards(quest_reward_type, mega_pokemon_id, mega_amount)
      amount = src.includes('_a') ? 0 : mega_amount
      break
    default:
      tt = `quest_reward_${quest_reward_type}`
      src = Icons.getRewards(quest_reward_type)
  }
  return { src, tt, amount }
}
