/**
 * A stored rule's conditions, as the seeds `ConditionEditor` opens with.
 * Only the conditions actually set become rows -- an unset bound is not a
 * condition someone added and left blank, it is one they never added.
 *
 * Reads the same vocabulary the editor and the renderer do
 * (`condition-vocabulary.ts`) instead of its own column list, so a rule's
 * range, choice and value columns need naming once, not here and in the
 * editor both.
 *
 * PvP seeds like any other range, plus the league its rank is named after.
 * It was skipped here once on the reasoning that its block's visibility
 * depends on the vocabulary rather than on `active` -- true, and about
 * whether the block renders, not about what it renders against. The block
 * read its league and both bounds out of these seeds, so skipping them left
 * it permanently blank while the card beside it described the same row's
 * league correctly.
 */

import type { ConditionSeed } from './condition-editor'
import type { ConditionPatch, Vocabulary } from './condition-vocabulary'
import { REACTMAP_VOCABULARY } from './condition-vocabulary'
import type { RulePatch } from './rules-query'

export function conditionSeeds<P extends ConditionPatch = RulePatch>(
  // `object` rather than a `Record<string, unknown>`: `Rule` and
  // `AlertRow` (`alert-editor.tsx`) both lack an index signature, which
  // TypeScript treats as incompatible with a mapped-type parameter even
  // though every field on either is read here only by the vocabulary's
  // own names. `object` accepts both without demanding one, and the cast
  // below is where the field-by-name reads actually happen.
  rule: object,
  vocab: Vocabulary<P> = REACTMAP_VOCABULARY as unknown as Vocabulary<P>,
): ConditionSeed[] {
  const row = rule as unknown as Record<string, unknown>
  const seeds: ConditionSeed[] = []
  for (const def of vocab.conditions) {
    if (def.kind === 'range') {
      const min = (row[def.minField] as number | null | undefined) ?? null
      const max = (row[def.maxField] as number | null | undefined) ?? null
      const label = def.labelField
        ? ((row[def.labelField] as number | string | null | undefined) ?? null)
        : null
      // A labelled range is present when its label is, even with both
      // bounds at their wildcards: a rule can name a league and leave the
      // ranks alone.
      if (min == null && max == null && label == null) continue
      seeds.push({ type: def.key, min, max, label })
    } else if (def.kind === 'choice' || def.kind === 'value') {
      const value = row[def.field] as number | string | null | undefined
      if (value == null) continue
      seeds.push({ type: def.key, value })
    }
  }
  return seeds
}
