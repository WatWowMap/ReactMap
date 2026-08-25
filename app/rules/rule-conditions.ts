/**
 * A stored rule's conditions, as the seeds `ConditionEditor` opens with.
 * Only the conditions actually set become rows -- an unset bound is not a
 * condition someone added and left blank, it is one they never added.
 */

import type { ConditionSeed, RangeKind } from './condition-editor'
import { RANGE_KINDS } from './condition-editor'
import type { Rule } from './rule-types'

/** The rule columns each range kind reads, in the same order the editor lists them. */
const RANGE_COLUMNS: Record<RangeKind, [keyof Rule, keyof Rule]> = {
  iv: ['ivMin', 'ivMax'],
  atk: ['atkMin', 'atkMax'],
  def: ['defMin', 'defMax'],
  sta: ['staMin', 'staMax'],
  level: ['levelMin', 'levelMax'],
  cp: ['cpMin', 'cpMax'],
  size: ['sizeMin', 'sizeMax'],
}

export function conditionSeeds(rule: Rule): ConditionSeed[] {
  const seeds: ConditionSeed[] = []
  for (const kind of RANGE_KINDS) {
    const [minKey, maxKey] = RANGE_COLUMNS[kind]
    const min = rule[minKey] as number | null
    const max = rule[maxKey] as number | null
    if (min == null && max == null) continue
    seeds.push({ type: kind, min, max })
  }
  if (rule.gender != null) seeds.push({ type: 'gender', value: rule.gender })
  return seeds
}
