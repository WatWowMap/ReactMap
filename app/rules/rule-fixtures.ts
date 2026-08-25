/**
 * Shared `Rule` fixtures for the rules model's client tests.
 *
 * Not itself a test file: `resolve-appearance.test.ts` and
 * `rules-query.test.tsx` both need a `Rule` built from the same defaults,
 * and duplicating `rule-grouping.test.ts`'s local `ruleFixture` a second
 * and third time is exactly the drift this file exists to avoid.
 */

import type { Rule } from './rule-types'

export function ruleFixture(overrides: Partial<Rule> & { id: number }): Rule {
  return {
    category: 'pokemon',
    name: 'Rule',
    size: null,
    glow: null,
    notify: false,
    speciesId: null,
    formId: null,
    pvpTargetSpecies: null,
    ivMin: null,
    ivMax: null,
    atkMin: null,
    atkMax: null,
    defMin: null,
    defMax: null,
    staMin: null,
    staMax: null,
    levelMin: null,
    levelMax: null,
    cpMin: null,
    cpMax: null,
    gender: null,
    sizeMin: null,
    sizeMax: null,
    pvpLeague: null,
    pvpRankMin: null,
    pvpRankMax: null,
    exclusions: [],
    enabled: true,
    ...overrides,
  }
}

/** `ruleMap([{ id: 7, size: 'xl' }, ...])` -> the `Map<number, Rule>` every resolver reads. */
export function ruleMap(
  rules: Array<Partial<Rule> & { id: number }>,
): Map<number, Rule> {
  return new Map(rules.map((rule) => [rule.id, ruleFixture(rule)]))
}
