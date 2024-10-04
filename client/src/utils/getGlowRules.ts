const OPERATOR: Record<string, (a: number, b: number) => boolean> = {
  '=': (a, b) => a === b,
  '<': (a, b) => a < b,
  '<=': (a, b) => a <= b,
  '>': (a, b) => a > b,
  '>=': (a, b) => a >= b,
}

export function getGlowRules(
  glowRules: ReturnType<
    (typeof import('@rm/server/src/ui/clientOptions'))['clientOptions']
  >['clientMenus']['pokemon']['glow']['sub'],
): ((pkmn: import('@rm/types').Pokemon) => string | null)[] {
  return Object.entries(glowRules)
    .filter(([, value]) => value.op && value.op in OPERATOR)
    .map(([key, { perm, op, num }]) => {
      const statKey = perm === 'iv' ? 'iv' : 'bestPvp'
      const func = OPERATOR[op]

      return (pkmn) =>
        Number.isInteger(pkmn[statKey]) && func(pkmn[statKey], num) ? key : null
    })
}
