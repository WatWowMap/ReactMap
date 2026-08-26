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
 *
 * `RuleSheet<P>` carries the same patch type parameter `ConditionEditor<P>`
 * does, and for the same reason: `vocabulary` and `onChange` must agree on
 * one schema, and tying them to one type parameter is what makes a
 * mismatched pair a compile error instead of a silent relabel. Task 12's
 * Alerts sheet is expected to reuse this component unmodified as
 * `RuleSheet<AlertPatch>` with Poracle's vocabulary.
 */

import { Label } from '../components/ui/label'
import { Switch } from '../components/ui/switch'
import type { ConditionSeed } from './condition-editor'
import { ConditionEditor } from './condition-editor'
import type { ConditionPatch, Vocabulary } from './condition-vocabulary'
import type { RulePatch } from './rules-query'
import type { SpeciesEntry, SpeciesSelection } from './species-picker'
import { SpeciesPicker } from './species-picker'

function toExclusionIds(selection: SpeciesSelection[]): number[] {
  return selection.map((entry) =>
    typeof entry === 'number' ? entry : entry.speciesId,
  )
}

export interface RuleSheetProps<P extends ConditionPatch = RulePatch> {
  /** The rule's subject: `null` means "Any Pokémon". */
  speciesId: number | null
  /** Whether the rule is switched on. A rule that is off matches nothing. */
  enabled?: boolean
  species?: SpeciesEntry[]
  exclusions?: number[]
  conditions?: ConditionSeed[]
  /** The schema `ConditionEditor` draws its rows from. Defaults to ReactMap's own. */
  vocabulary?: Vocabulary<P>
  onChange?: (patch: P) => void
  onExclusionsChange?: (exclusions: number[]) => void
}

export function RuleSheet<P extends ConditionPatch = RulePatch>({
  speciesId,
  enabled = true,
  species = [],
  exclusions = [],
  conditions,
  vocabulary,
  onChange,
  onExclusionsChange,
}: RuleSheetProps<P>) {
  return (
    <div className="flex flex-col gap-4">
      {/* The off switch sits above the conditions rather than beside the
          Save button: it is a statement about the whole rule, not another
          field of it, and it reports as a patch like every other edit so
          the split warning gates it too. `enabled` isn't vocabulary-driven
          -- every schema this sheet edits carries an on/off column -- so
          this is the one write here that stays outside the `P` inference
          `ConditionEditor` participates in, and needs its own narrow
          assertion rather than a structural guarantee. */}
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor="rule-enabled">Enabled</Label>
        <Switch
          id="rule-enabled"
          checked={enabled}
          onCheckedChange={(next) =>
            onChange?.({ enabled: next } as unknown as P)
          }
        />
      </div>
      <ConditionEditor
        {...(conditions ? { conditions } : {})}
        {...(vocabulary ? { vocabulary } : {})}
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
