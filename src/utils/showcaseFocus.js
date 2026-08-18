// @ts-check

const BUDDY_SHOWCASE_LABEL_KEYS = Object.freeze({
  2: 'focus_biggest_buddy_pokemon_good',
  3: 'focus_biggest_buddy_pokemon_great',
  4: 'focus_biggest_buddy_pokemon_ultra',
  5: 'focus_biggest_buddy_pokemon_best',
})

/** @param {unknown} value */
const positiveInteger = (value) => {
  const numeric = Number(value)
  return Number.isInteger(numeric) && numeric > 0 ? numeric : null
}

/** @param {unknown} focus */
export const isBuddyShowcaseFocus = (focus) =>
  !!focus &&
  typeof focus === 'object' &&
  !Array.isArray(focus) &&
  focus.type === 'buddy'

/** @param {unknown} focus */
export function getShowcaseBuddyFilterKey(focus) {
  if (!isBuddyShowcaseFocus(focus)) return null
  const minLevel = positiveInteger(focus.min_level)
  return minLevel ? `y${minLevel}` : null
}

/** @param {unknown} focus */
export function getShowcaseBuddyLabelKey(focus) {
  if (!isBuddyShowcaseFocus(focus)) return null
  const minLevel = positiveInteger(focus.min_level)
  return BUDDY_SHOWCASE_LABEL_KEYS[minLevel] || 'focus_biggest_buddy_pokemon'
}

/** @param {string} id */
export function getShowcaseBuddyFilterLabelKey(id) {
  return (
    BUDDY_SHOWCASE_LABEL_KEYS[positiveInteger(id.slice(1))] ||
    'focus_biggest_buddy_pokemon'
  )
}
