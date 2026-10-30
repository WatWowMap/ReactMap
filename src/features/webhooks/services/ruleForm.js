/**
 * Converts between a PoracleNG v2 rule (`null` = any) and the flat form object
 * the webhook editor works on. No imports: the server tests load this file.
 */

/** Fields that exist only in the editor and never reach a rule. */
export const FORM_ONLY_FIELDS = [
  'byDistance',
  'pvpEntry',
  'allForms',
  'allMoves',
  'noIv',
  'xs',
  'xl',
  'everything_individually',
  'gymName',
  'profile_no',
  'enabled',
]

/** Categories for which v2 rejects `edit: true`. */
const NO_EDIT = new Set(['gym', 'invasion', 'nest', 'quest', 'maxbattle'])
/** Categories that support `summary`. */
const SUMMARY = new Set(['quest'])

/** Fields that mean nothing when the rule is a PVP entry. */
const IV_FAMILY = [
  'min_iv',
  'max_iv',
  'min_cp',
  'max_cp',
  'min_level',
  'max_level',
  'atk',
  'max_atk',
  'def',
  'max_def',
  'sta',
  'max_sta',
]

/**
 * Plain numeric fields whose v2 wildcard `null` the editor shows as 0
 * (0 is also what v2 stores for "any" in these fields).
 */
const NULL_AS_ZERO = [
  'min_time',
  'amount',
  'min_spawn_avg',
  'pvp_ranking_min_cp',
  'pvp_ranking_cap',
]

const PVP_FIELDS = [
  'pvp_ranking_best',
  'pvp_ranking_worst',
  'pvp_ranking_min_cp',
  'pvp_ranking_cap',
  'pvp_ranking_evolution',
]

/**
 * Collects every slider definition, wherever it sits in `ui.ui`.
 * @param {any} node
 * @param {any[]} [found]
 * @returns {any[]}
 */
const collectSliders = (node, found = []) => {
  if (node && typeof node === 'object') {
    if (Array.isArray(node.sliders)) found.push(...node.sliders)
    Object.values(node).forEach((child) => {
      if (child && typeof child === 'object' && !Array.isArray(child)) {
        collectSliders(child, found)
      }
    })
  }
  return found
}

/**
 * @param {string} category
 * @param {Record<string, any>} rule
 * @param {any} ui
 * @returns {Record<string, any>}
 */
export function ruleToForm(category, rule, ui) {
  const form = { ...ui.defaults, ...rule }
  collectSliders(ui.ui).forEach(({ low, high, min, max, anyLow, anyHigh }) => {
    if (form[low] === null || form[low] === undefined) {
      form[low] = anyLow ? min : (ui.defaults[low] ?? min)
    }
    if (form[high] === null || form[high] === undefined) {
      form[high] = anyHigh ? max : (ui.defaults[high] ?? max)
    }
  })
  NULL_AS_ZERO.forEach((key) => {
    if (key in ui.defaults && form[key] === null) form[key] = 0
  })
  form.byDistance = form.distance > 0
  form.pvpEntry = form.pvp_ranking_league > 0
  if ('form' in ui.defaults) form.allForms = !form.form
  if ('move' in ui.defaults) {
    form.allMoves = form.move === null || form.move === undefined
  }
  if (category === 'pokemon') {
    form.xs = rule.max_weight !== null && rule.max_weight !== undefined
    form.xl = rule.min_weight !== null && rule.min_weight !== undefined
  }
  return form
}

/**
 * Like `ruleToForm`, but keeps the form-only fields `value` already carries,
 * so it accepts either a stored rule or a form the editor produced earlier.
 * @param {string} category
 * @param {Record<string, any>} [value]
 * @param {any} ui
 * @returns {Record<string, any>}
 */
export function toForm(category, value, ui) {
  const source = value || {}
  const form = ruleToForm(category, source, ui)
  FORM_ONLY_FIELDS.forEach((key) => {
    if (key in source) form[key] = source[key]
  })
  return form
}

/**
 * @param {string} category
 * @param {Record<string, any>} form
 * @param {any} ui
 * @param {Record<string, any>} [original]
 * @returns {Record<string, any>}
 */
export function formToRule(category, form, ui, original) {
  const converted = { ...form }
  collectSliders(ui.ui).forEach(({ low, high, min, max, anyLow, anyHigh }) => {
    if (anyLow && converted[low] === min) converted[low] = null
    if (anyHigh && converted[high] === max) converted[high] = null
  })
  if (!form.byDistance) converted.distance = 0
  if ('form' in ui.defaults && form.allForms) converted.form = null
  if ('move' in ui.defaults && form.allMoves) converted.move = null
  if (category === 'pokemon') {
    if (form.pvpEntry) {
      IV_FAMILY.forEach((key) => {
        converted[key] = null
      })
    } else {
      converted.pvp_ranking_league = 0
      PVP_FIELDS.forEach((key) => {
        // pvp_ranking_evolution is not a default; only clear it if present
        if (key in ui.defaults || key in (original || {})) converted[key] = null
      })
    }
  }
  if (NO_EDIT.has(category)) delete converted.edit
  if (!SUMMARY.has(category)) delete converted.summary
  FORM_ONLY_FIELDS.forEach((key) => delete converted[key])

  const rule = { ...original, ...converted }
  // Not a form field: survives from the original while pvp is on.
  if (category === 'pokemon' && form.pvpEntry && original) {
    rule.pvp_ranking_evolution = original.pvp_ranking_evolution ?? null
  }
  delete rule.description
  return rule
}

const TEAM_INDEX = { harmony: 0, mystic: 1, valor: 2, instinct: 3, any: 4 }
const INCIDENT_IDS = { 7: 'gold-stop', 8: 'kecleon', 9: 'showcase' }
const GENDER_NUMBER = { male: 1, female: 2 }

/**
 * The key a rule is filed under in the editor's filter map (also drives icons).
 * @param {string} category
 * @param {Record<string, any>} rule
 * @param {Record<string, any>} [invasions] masterfile invasions
 * @returns {string}
 */
export function ruleId(category, rule, invasions = {}) {
  switch (category) {
    case 'egg':
      return `e${rule.level}`
    case 'raid':
      return rule.pokemon_id === null || rule.pokemon_id === undefined
        ? `r${rule.level ?? 90}`
        : `${rule.pokemon_id}-${rule.form ?? 0}`
    case 'gym':
      return `t${TEAM_INDEX[rule.team] ?? rule.team ?? 4}-0`
    case 'incident':
      return INCIDENT_IDS[rule.display_type] ?? `incident-${rule.display_type}`
    case 'invasion': {
      const type = rule.grunt_type
      if (!type || type === 'everything') return 'i0'
      const gender = GENDER_NUMBER[rule.gender] || 1
      const found = Object.keys(invasions || {}).find(
        (key) =>
          invasions[key]?.type?.toLowerCase() === type.toLowerCase() &&
          (invasions[key]?.gender === 0 || invasions[key]?.gender === gender),
      )
      return `i${+found || 0}`
    }
    case 'lure':
      return `l${rule.lure_id}`
    case 'quest':
      switch (rule.reward_type) {
        case 2:
          return `q${rule.reward}`
        case 3:
          return `d${rule.amount ?? 0}`
        case 4:
          return `c${rule.reward}`
        case 9:
          return `x${rule.reward}`
        case 12:
          return `m${rule.reward}-${rule.amount ?? 0}`
        default:
          return `${rule.reward}-${rule.form ?? 0}`
      }
    default:
      return `${rule.pokemon_id ?? 0}-${rule.form ?? 0}`
  }
}
