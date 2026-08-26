/**
 * A stored rule's conditions, as the seeds `ConditionEditor` opens with.
 * Only the conditions actually set become rows -- an unset bound is not a
 * condition someone added and left blank, it is one they never added.
 *
 * Reads the same vocabulary the editor and the renderer do
 * (`condition-vocabulary.ts`) instead of its own column list, so a rule's
 * range and choice columns need naming once, not here and in the editor
 * both. PvP is left unseeded, matching `ConditionEditor`'s permanent block:
 * its visibility already depends on the vocabulary declaring a `pvp`
 * condition, not on `active`, so there is no row here for it to seed.
 */

import type { ConditionSeed } from './condition-editor'
import type { ConditionPatch, Vocabulary } from './condition-vocabulary'
import { REACTMAP_VOCABULARY } from './condition-vocabulary'
import type { Rule } from './rule-types'
import type { RulePatch } from './rules-query'

export function conditionSeeds<P extends ConditionPatch = RulePatch>(
  rule: Rule,
  vocab: Vocabulary<P> = REACTMAP_VOCABULARY as unknown as Vocabulary<P>,
): ConditionSeed[] {
  const row = rule as unknown as Record<string, unknown>
  const seeds: ConditionSeed[] = []
  for (const def of vocab.conditions) {
    if (def.kind === 'range' && def.key !== 'pvp') {
      const min = (row[def.minField] as number | null | undefined) ?? null
      const max = (row[def.maxField] as number | null | undefined) ?? null
      if (min == null && max == null) continue
      seeds.push({ type: def.key, min, max })
    } else if (def.kind === 'choice') {
      const value = row[def.field] as number | string | null | undefined
      if (value == null) continue
      seeds.push({ type: def.key, value })
    }
  }
  return seeds
}
