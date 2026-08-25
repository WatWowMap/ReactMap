// server/src/services/rule-enabled.ts
//
// One question, asked in three places, so it can only ever have one
// answer: is this rule switched on?
//
// A disabled rule is still stored, still listed and still editable -- it
// simply matches nothing until it is switched back on. Both evaluators
// have to honour that independently: `rules-to-golbat-filters.ts` so a
// disabled rule contributes no DNF clause and its entities are never
// fetched, and `rule-local-filter.ts` so its id never reaches an entity's
// `matched` array, where it would go on driving appearance and the marker
// popup's explanation lines on the client.
//
// Absent counts as enabled. The column defaults to true, an older row
// predates it entirely, and a fixture written before this feature existed
// says nothing about it -- none of those are a rule somebody turned off.

/** True unless the rule row explicitly says it is off. */
function isRuleEnabled(
  rule: { enabled?: unknown } | null | undefined,
): boolean {
  if (rule == null) return false
  return rule.enabled == null || Boolean(rule.enabled)
}

/** The subset of `rules` that is switched on, in the order given. */
function enabledRules<T extends { enabled?: unknown }>(
  rules: T[] | undefined,
): T[] {
  return (rules ?? []).filter(isRuleEnabled)
}

export { enabledRules, isRuleEnabled }
