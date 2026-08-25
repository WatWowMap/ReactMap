/**
 * The editor behind one rule card: conditions plus, when the subject is
 * "Any Pokémon" (`speciesId === null`), the species this rule should
 * *not* match. Exclusions only make sense against that unrestricted
 * subject -- a rule already narrowed to one species has nothing left to
 * carve an exception out of -- so the control disappears entirely rather
 * than sitting there disabled for a one-species rule.
 *
 * `exclusions` is a plain `number[]` (species ids only, no per-form
 * exclusion) because that is what `Rule.exclusions` carries on the wire
 * today (`rule-types.ts`); a form-level exclusion in the picker collapses
 * to its species id here rather than being silently dropped.
 */

import type { ConditionSeed } from './condition-editor'
import { ConditionEditor } from './condition-editor'
import type { RulePatch } from './rules-query'
import type { SpeciesEntry, SpeciesSelection } from './species-picker'
import { SpeciesPicker } from './species-picker'

function toExclusionIds(selection: SpeciesSelection[]): number[] {
  return selection.map((entry) =>
    typeof entry === 'number' ? entry : entry.speciesId,
  )
}

export interface RuleSheetProps {
  /** The rule's subject: `null` means "Any Pokémon". */
  speciesId: number | null
  species?: SpeciesEntry[]
  exclusions?: number[]
  conditions?: ConditionSeed[]
  onChange?: (patch: RulePatch) => void
  onExclusionsChange?: (exclusions: number[]) => void
}

export function RuleSheet({
  speciesId,
  species = [],
  exclusions = [],
  conditions,
  onChange,
  onExclusionsChange,
}: RuleSheetProps) {
  return (
    <div className="flex flex-col gap-4">
      <ConditionEditor
        {...(conditions ? { conditions } : {})}
        {...(onChange ? { onChange } : {})}
      />
      {speciesId === null && (
        <div className="flex flex-col gap-2 border-t border-border pt-3">
          <p className="text-sm font-medium text-foreground">Except</p>
          <SpeciesPicker
            species={species}
            selected={exclusions}
            onChange={(next) => onExclusionsChange?.(toExclusionIds(next))}
          />
        </div>
      )}
    </div>
  )
}
