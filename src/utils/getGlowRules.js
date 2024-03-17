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
 *
 * @param {ReturnType<import('server/src/services/ui/clientOptions')>['clientMenus']['pokemon']['glow']['sub']} glowRules
 * @returns {((pkmn: import('@rm/types').Pokemon) => string | null)[]}
 */
export function getGlowRules(glowRules) {
  return Object.entries(glowRules)
    .filter(([, value]) => value.op && value.op in OPERATOR)
    .map(([key, { perm, op, num }]) => {
      const statKey = perm === 'iv' ? 'iv' : 'bestPvp'
      const func = OPERATOR[op]
      return (pkmn) =>
        Number.isInteger(pkmn[statKey]) && func(pkmn[statKey], num) ? key : null
    })
}
