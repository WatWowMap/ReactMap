// @ts-check

const rewardPrimaryBehavior = Object.freeze({
  map: Object.freeze({
    rewardAsPrimary: true,
  }),
  popup: Object.freeze({
    rewardAsPrimary: true,
  }),
})

const defaultBehavior = Object.freeze({
  map: Object.freeze({
    rewardAsPrimary: false,
  }),
  popup: Object.freeze({
    rewardAsPrimary: false,
  }),
})

const toFrozenSet = (values) => Object.freeze(new Set(values.map(Number)))

const rewardPrimaryRules = [
  {
    types: Object.freeze(new Set(['TAPPABLE_TYPE_MAPLE'])),
    itemIds: toFrozenSet([1151, 1152, 1155]),
    behavior: rewardPrimaryBehavior,
  },
  {
    types: Object.freeze(new Set(['TAPPABLE_TYPE_BREAKFAST'])),
    itemIds: toFrozenSet([650]),
    behavior: rewardPrimaryBehavior,
  },
]

/**
 * Determines display overrides for a tappable marker and popup.
 * @param {import('@rm/types').Tappable} tappable
 */
export function getTappableDisplaySettings(tappable) {
  const typeKey = tappable?.type?.toString()
  if (!typeKey) {
    return defaultBehavior
  }

  const itemId = Number(tappable?.item_id)
  if (!Number.isFinite(itemId)) {
    return defaultBehavior
  }

  for (let i = 0; i < rewardPrimaryRules.length; i += 1) {
    const rule = rewardPrimaryRules[i]
    if (rule.types.has(typeKey) && rule.itemIds.has(itemId)) {
      return rule.behavior
    }
  }

  return defaultBehavior
}

export const TAPPABLE_DISPLAY_DEFAULT = defaultBehavior
