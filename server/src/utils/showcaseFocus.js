// @ts-check

const SHOWCASE_DISPLAY_TYPE = 9
const SHOWCASE_BUDDY_FILTER_PREFIX = 'y'
const SHOWCASE_BUDDY_LEVELS = Object.freeze([2, 3, 4, 5])
const SHOWCASE_BUDDY_FILTER_KEYS = Object.freeze(
  SHOWCASE_BUDDY_LEVELS.map(
    (level) => `${SHOWCASE_BUDDY_FILTER_PREFIX}${level}`,
  ),
)

/**
 * Golbat stores `showcase_focus` as JSON text in SQL and returns that same text
 * from its Pokestop API. Accept an already-decoded object too so callers can
 * safely reuse the normalized GraphQL shape.
 *
 * @param {unknown} value
 * @returns {Record<string, any> | null}
 */
function parseShowcaseFocus(value) {
  let focus = value
  if (typeof focus === 'string') {
    try {
      focus = JSON.parse(focus)
    } catch {
      return null
    }
  }
  if (
    !focus ||
    typeof focus !== 'object' ||
    Array.isArray(focus) ||
    typeof focus.type !== 'string'
  ) {
    return null
  }
  return focus
}

/** @param {unknown} value */
const positiveInteger = (value) => {
  const numeric = Number(value)
  return Number.isInteger(numeric) && numeric > 0 ? numeric : null
}

/** @param {unknown} value */
const nonNegativeInteger = (value) => {
  const numeric = Number(value)
  return Number.isInteger(numeric) && numeric >= 0 ? numeric : null
}

/**
 * Returns the existing ReactMap showcase filter key represented by a structured
 * focus. Unknown focus types intentionally return null and fall back to the
 * generic display-type filter.
 *
 * @param {unknown} value
 * @returns {string | null}
 */
function getShowcaseFocusFilterKey(value) {
  const focus = parseShowcaseFocus(value)
  if (!focus) return null

  switch (focus.type) {
    case 'pokemon': {
      const pokemonId = positiveInteger(focus.pokemon_id)
      if (!pokemonId) return null
      return `f${pokemonId}-${nonNegativeInteger(focus.pokemon_form) ?? 0}`
    }
    case 'type': {
      const typeId = positiveInteger(focus.pokemon_type_1)
      return typeId ? `h${typeId}` : null
    }
    case 'buddy': {
      const minLevel = positiveInteger(focus.min_level)
      return minLevel ? `${SHOWCASE_BUDDY_FILTER_PREFIX}${minLevel}` : null
    }
    default:
      return null
  }
}

/**
 * Resolve the legacy fields used by existing marker/icon code from the
 * authoritative focus object. A parsed non-Pokemon/type focus deliberately
 * returns null fields so stale legacy mirrors cannot leak into its display.
 *
 * @param {unknown} value
 */
function getShowcaseFocusDisplay(value) {
  const focus = parseShowcaseFocus(value)
  if (!focus) return null

  const pokemonId =
    focus.type === 'pokemon' ? positiveInteger(focus.pokemon_id) : null
  const pokemonTypeId =
    focus.type === 'type' ? positiveInteger(focus.pokemon_type_1) : null
  return {
    focus,
    pokemonId,
    pokemonFormId:
      pokemonId && focus.type === 'pokemon'
        ? (nonNegativeInteger(focus.pokemon_form) ?? 0)
        : null,
    pokemonTypeId,
  }
}

/**
 * @param {{
 *  display_type?: number | string | null,
 *  showcase_focus?: unknown,
 *  showcase_pokemon_id?: number | null,
 *  showcase_pokemon_form_id?: number | null,
 *  showcase_pokemon_type_id?: number | null,
 * }} event
 */
function getShowcaseEventFilterKey(event) {
  const focus = parseShowcaseFocus(event.showcase_focus)
  if (focus) {
    return getShowcaseFocusFilterKey(focus) || `b${SHOWCASE_DISPLAY_TYPE}`
  }
  if (event.showcase_pokemon_id) {
    return `f${event.showcase_pokemon_id}-${
      event.showcase_pokemon_form_id ?? 0
    }`
  }
  if (event.showcase_pokemon_type_id) {
    return `h${event.showcase_pokemon_type_id}`
  }
  return `b${event.display_type}`
}

module.exports = {
  SHOWCASE_BUDDY_FILTER_KEYS,
  SHOWCASE_BUDDY_FILTER_PREFIX,
  SHOWCASE_BUDDY_LEVELS,
  SHOWCASE_DISPLAY_TYPE,
  getShowcaseEventFilterKey,
  getShowcaseFocusDisplay,
  getShowcaseFocusFilterKey,
  parseShowcaseFocus,
}
