// @ts-check

/**
 * Describes a tappable's reward by the quest reward type whose icons and
 * names it shares, along with its filter key. Null for rewards not shown.
 * @param {import('@rm/types').Tappable} tappable
 * @returns {{ rewardType: 2 | 4 | 9 | 12, id: number, filterKey: string } | null}
 */
export function getTappableReward(tappable) {
  if (tappable.item_id) {
    return {
      rewardType: 2,
      id: tappable.item_id,
      filterKey: `q${tappable.item_id}`,
    }
  }
  const id = tappable.reward_pokemon_id
  if (!id) return null
  switch (tappable.reward_type) {
    case 'pokemon_candy':
      return { rewardType: 4, id, filterKey: `c${id}` }
    case 'xl_candy':
      return { rewardType: 9, id, filterKey: `x${id}` }
    case 'mega_energy_pokemon_id':
    case 'temp_evo_pokemon_branch':
      return {
        rewardType: 12,
        id,
        filterKey: tappable.temp_evolution
          ? `m${id}-${tappable.count}-${tappable.temp_evolution}`
          : `m${id}-${tappable.count}`,
      }
    default:
      return null
  }
}
