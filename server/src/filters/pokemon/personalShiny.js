// @ts-check
const { getParsedPvp } = require('./functions')

/**
 * The IV range a filter has for personal shinies, all of them by default
 * @param {Record<string, any> | undefined} filter
 * @returns {[number, number]}
 */
const getShinyRange = (filter) => {
  const range = filter?.personal_shiny_iv
  if (!Array.isArray(range) || range.length !== 2) return [0, 100]
  const min = Number(range[0])
  const max = Number(range[1])
  return [Number.isFinite(min) ? min : 0, Number.isFinite(max) ? max : 100]
}

/**
 * Personal shinies are judged by a filter's other conditions with its shiny
 * IV range in place of its IV range
 * @template {Record<string, any> | undefined} T
 * @param {T} filter
 * @returns {T}
 */
const toShinyFilter = (filter) =>
  filter && typeof filter === 'object'
    ? { ...filter, iv: getShinyRange(filter) }
    : filter

/**
 * Whether a personal shiny passes every condition the filter sets, the shiny
 * IV range in place of the IV range; used for only personal shinies, where
 * all personal shinies show unless a condition narrows them down. Unlike the
 * regular filters (IV or PvP or size) every set condition has to match, the
 * PvP leagues among themselves and XXS / XXL as on the map (either one).
 * @param {import("./Backend").PkmnBackend} backend
 * @param {import("@rm/types").Pokemon} pkmn
 * @returns {boolean}
 */
const passesAll = (backend, pkmn) => {
  const filter = backend.filter || {}
  /** @param {unknown} value @param {unknown} range */
  const within = (value, range) =>
    !Array.isArray(range) ||
    (typeof value === 'number' && value >= range[0] && value <= range[1])
  const [min, max] = getShinyRange(filter)
  if ((min > 0 || max < 100) && !within(pkmn.iv, [min, max])) return false
  const keys = backend.filterKeys
  if (
    !['atk_iv', 'def_iv', 'sta_iv', 'level', 'cp'].every(
      (key) => !keys.has(key) || within(pkmn[key], filter[key]),
    )
  ) {
    return false
  }
  if (keys.has('gender') && pkmn.gender !== filter.gender) return false
  if (
    (keys.has('xxs') || keys.has('xxl')) &&
    !(
      (keys.has('xxs') && pkmn.size === 1) ||
      (keys.has('xxl') && pkmn.size === 5)
    )
  ) {
    return false
  }
  // like on the map, any of the leagues set is enough. The ranks are checked
  // here against the filter's own range: the built PvP list isn't narrowed
  // down when all PvP ranks are shown
  const leagues = [...keys].filter((key) => backend.pvpLeagues?.has(key))
  if (!leagues.length) return true
  const pvp = getParsedPvp(pkmn)
  return leagues.some((league) =>
    (pvp[league] || []).some(
      (entry) =>
        within(entry.rank, filter[league]) &&
        (!entry.evolution || !!backend.mods?.onlyPvpMega) &&
        (entry.capped || !!backend.mods?.[`onlyPvp${entry.cap}`]),
    ),
  )
}

/**
 * A Pokémon filter set to only shinies: its regular conditions don't show
 * anything, only its shiny IV range does
 * @param {{ id?: string, filter?: Record<string, any> }} backend
 */
const isShinyOnlyFilter = (backend) =>
  backend?.id !== 'global' &&
  !!backend?.filter?.personal_shiny_only &&
  !backend.filter.all

/**
 * Like the other ranges, the full shiny IV range (0-100) sets no condition:
 * the filter then shows no personal shinies beyond its regular matches
 * @param {{ filter?: Record<string, any> }} backend
 */
const hasShinyRange = (backend) => {
  const [min, max] = getShinyRange(backend?.filter)
  return min > 0 || max < 100
}

module.exports = {
  getShinyRange,
  toShinyFilter,
  passesAll,
  isShinyOnlyFilter,
  hasShinyRange,
}
