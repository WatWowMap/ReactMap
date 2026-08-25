import type { Rule, RuleGroup } from './rule-types'

/**
 * Every field a group's members must agree on, in a fixed order, with the
 * sorted exclusion list appended. `id`, `speciesId`, and `formId` are
 * deliberately left out: `id` is per-row identity, and species/form are the
 * one axis a group is allowed to differ on.
 */
function buildGroupKey(rule: Rule): string {
  return JSON.stringify([
    rule.category,
    rule.name,
    rule.size,
    rule.glow,
    rule.notify,
    // Two rules identical but for being switched off are not one card:
    // nothing in the schema can express "off for this member only", so
    // disabling one species out of twenty-five splits it out exactly as
    // changing its size does.
    rule.enabled,
    rule.pvpTargetSpecies,
    rule.ivMin,
    rule.ivMax,
    rule.atkMin,
    rule.atkMax,
    rule.defMin,
    rule.defMax,
    rule.staMin,
    rule.staMax,
    rule.levelMin,
    rule.levelMax,
    rule.cpMin,
    rule.cpMax,
    rule.gender,
    rule.sizeMin,
    rule.sizeMax,
    rule.pvpLeague,
    rule.pvpRankMin,
    rule.pvpRankMax,
    [...rule.exclusions].sort((a, b) => a - b),
  ])
}

export function groupRules(rules: Rule[]): RuleGroup[] {
  const groups = new Map<string, RuleGroup>()

  for (const rule of rules) {
    const key = buildGroupKey(rule)
    const group = groups.get(key)
    if (group) {
      group.ruleIds.push(rule.id)
      group.speciesIds.push(rule.speciesId)
    } else {
      groups.set(key, {
        id: String(rule.id),
        name: rule.name,
        ruleIds: [rule.id],
        speciesIds: [rule.speciesId],
        sample: rule,
      })
    }
  }

  // The group id is the lowest member id, fixed up once every member has
  // been collected rather than tracked incrementally.
  for (const group of groups.values()) {
    group.id = String(Math.min(...group.ruleIds))
  }

  return [...groups.values()].sort((a, b) => Number(a.id) - Number(b.id))
}
