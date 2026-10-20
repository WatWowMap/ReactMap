// @ts-check
const OPERATOR =
  /** @type {Record<string, (a: number, b: number) => boolean>} */ ({
    '=': (a, b) => a === b,
    '<': (a, b) => a < b,
    '<=': (a, b) => a <= b,
    '>': (a, b) => a > b,
    '>=': (a, b) => a >= b,
  })

/**
 * Magic color value for a rule that should render as a rainbow halo instead of
 * a solid drop-shadow color.
 */
export const RAINBOW_GLOW = 'rainbow'

/**
 * A glow rule: returns the rule name when a pokemon matches, or null. The
 * `conditions` count lets callers prefer a more specific rule (shundo) over the
 * individual rules it combines (hundo, shiny for me).
 * @typedef {((pkmn: import('@rm/types').Pokemon) => string | null) & { conditions: number }} GlowRule
 */

/**
 *
 * @param {ReturnType<import('server/src/ui/clientOptions')['clientOptions']>['clientMenus']['pokemon']['glow']['sub']} glowRules
 * @returns {GlowRule[]}
 */
export function getGlowRules(glowRules) {
  return Object.entries(glowRules)
    .filter(([, value]) => {
      const perms = [value.perm].flat()
      return (
        perms.includes('personalShiny') || (value.op && value.op in OPERATOR)
      )
    })
    .map(([key, { perm, op, num }]) => {
      const perms = [perm].flat()
      /** @type {((pkmn: import('@rm/types').Pokemon) => boolean)[]} */
      const conditions = []
      // shiny for one of the viewer's players or not, so this condition takes
      // no op or num
      if (perms.includes('personalShiny')) {
        conditions.push((pkmn) => !!pkmn.personal_shiny?.length)
      }
      if (op && op in OPERATOR) {
        const statKey = perms.includes('iv') ? 'iv' : 'bestPvp'
        const func = OPERATOR[op]
        conditions.push(
          (pkmn) => Number.isInteger(pkmn[statKey]) && func(pkmn[statKey], num),
        )
      }
      /** @type {GlowRule} */
      const rule = (pkmn) =>
        conditions.length > 0 &&
        conditions.every((condition) => condition(pkmn))
          ? key
          : null
      rule.conditions = conditions.length
      return rule
    })
}

/**
 * Pick the glow color for a pokemon. A combined rule (shundo) wins over the
 * individual rules it overlaps; any other overlap falls back to Multiple.
 * @param {GlowRule[]} glowRules
 * @param {import('@rm/types').Pokemon} pkmn
 * @param {Record<string, string>} userSettings
 * @returns {string | undefined}
 */
export function getGlowColor(glowRules, pkmn, userSettings) {
  const matched = glowRules
    .map((rule) => ({ key: rule(pkmn), conditions: rule.conditions }))
    .filter(({ key }) => key && userSettings[key])
  if (matched.length > 1) {
    const combined = matched.find(({ conditions }) => conditions > 1)
    return userSettings[combined ? combined.key : 'Multiple']
  }
  return matched.length ? userSettings[matched[0].key] : undefined
}
