/**
 * The client's view of a rule row, as `rules.list` returns it. The server
 * has its own Drizzle-inferred types for `rule` + `rule_pokemon`; the wire
 * is the contract between them, not a shared TypeScript interface.
 */
export interface Rule {
  id: number
  category: string
  name: string
  size: string | null
  glow: string | null
  notify: boolean
  /** False means the user switched this rule off; it matches nothing. */
  enabled: boolean
  speciesId: number | null
  formId: number | null
  pvpTargetSpecies: number | null
  ivMin: number | null
  ivMax: number | null
  atkMin: number | null
  atkMax: number | null
  defMin: number | null
  defMax: number | null
  staMin: number | null
  staMax: number | null
  levelMin: number | null
  levelMax: number | null
  cpMin: number | null
  cpMax: number | null
  gender: number | null
  sizeMin: number | null
  sizeMax: number | null
  pvpLeague: number | null
  pvpRankMin: number | null
  pvpRankMax: number | null
  // Species (and optionally form) excluded from an otherwise-matching rule.
  exclusions: number[]
}

/**
 * A display-only grouping of rules that are identical except for the
 * species/form they target — e.g. one "Rare" card covering 25 species
 * instead of 25 separate rows. Derived client-side; the server never
 * groups.
 */
export interface RuleGroup {
  id: string // stable: the lowest rule id in the group, as a string
  name: string
  ruleIds: number[]
  speciesIds: (number | null)[]
  sample: Rule // any member; they are identical except for species
}
