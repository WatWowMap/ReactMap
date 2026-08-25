/**
 * What a card opens into: one group's rule sheet, plus the two things a
 * sheet over a GROUP needs that a sheet over one row does not.
 *
 * The first is who the edit is for. A group is several rows differing only
 * in their subject, so a change either rewrites every row identically or
 * peels one member off into its own card -- the storage model allows no
 * third answer (`split-warning.tsx`). Which of the two is happening is a
 * choice only the person editing can make, so it is a control rather than
 * a guess, and it appears only when there is more than one member to
 * choose between.
 *
 * The second is that edits are held until Save. `ConditionEditor` reports
 * on every keystroke, and gating each of those through the split warning
 * would put a dialog in front of someone typing a number.
 */

import { useState } from 'react'
import { Button } from '../components/ui/button'
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group'
import { conditionSeeds } from './rule-conditions'
import { RuleSheet } from './rule-sheet'
import type { RuleGroup } from './rule-types'
import type { RulePatch } from './rules-query'
import type { SpeciesEntry } from './species-picker'
import { SplitWarning } from './split-warning'
import type { NamesLookup } from './use-names'

/** The whole group, rather than one of its members. */
const EVERY_MEMBER = 'all'

export interface RuleEditorProps {
  group: RuleGroup
  names: NamesLookup
  /** The species catalog the exclusion picker draws from. */
  species?: SpeciesEntry[]
  onCommit: (ruleIds: number[], patch: RulePatch) => void
}

function labelFor(speciesId: number | null, names: NamesLookup): string {
  return speciesId === null ? 'Any Pokémon' : names.species(speciesId)
}

export function RuleEditor({
  group,
  names,
  species = [],
  onCommit,
}: RuleEditorProps) {
  const [target, setTarget] = useState<string>(EVERY_MEMBER)
  const [draft, setDraft] = useState<RulePatch>({})

  const targetIndex = group.ruleIds.findIndex((id) => String(id) === target)
  const targetRuleId = group.ruleIds[targetIndex]
  const editingOneMember = targetRuleId !== undefined
  const ruleIds = editingOneMember ? [targetRuleId] : group.ruleIds

  // A change aimed at every member rewrites them identically and separates
  // nothing, so there is nothing to warn about. Only singling one member
  // out of a larger group peels it into its own row.
  const separates = editingOneMember && group.ruleIds.length > 1

  return (
    <div className="flex flex-col gap-4">
      {group.ruleIds.length > 1 && (
        <div className="flex flex-col gap-2">
          <span className="text-sm text-muted-foreground">Applies to</span>
          <RadioGroup
            className="flex flex-col gap-1.5"
            value={target}
            onValueChange={setTarget}
          >
            <span className="flex items-center gap-1.5 text-sm">
              <RadioGroupItem id="applies-all" value={EVERY_MEMBER} />
              <label htmlFor="applies-all">
                {`All ${group.ruleIds.length}`}
              </label>
            </span>
            {group.ruleIds.map((ruleId, index) => (
              <span key={ruleId} className="flex items-center gap-1.5 text-sm">
                <RadioGroupItem
                  id={`applies-${ruleId}`}
                  value={String(ruleId)}
                />
                <label htmlFor={`applies-${ruleId}`}>
                  {labelFor(group.speciesIds[index] ?? null, names)}
                </label>
              </span>
            ))}
          </RadioGroup>
        </div>
      )}

      <RuleSheet
        speciesId={group.sample.speciesId}
        species={species}
        exclusions={group.sample.exclusions}
        conditions={conditionSeeds(group.sample)}
        onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
        onExclusionsChange={(exclusions) =>
          setDraft((current) => ({ ...current, exclusions }))
        }
      />

      <SplitWarning
        groupSize={separates ? group.ruleIds.length : 1}
        editingLabel={
          editingOneMember
            ? labelFor(group.speciesIds[targetIndex] ?? null, names)
            : group.name
        }
        onCommit={(patch) => onCommit(ruleIds, patch)}
      >
        {(attemptChange) => (
          <Button
            type="button"
            className="self-start"
            onClick={() => attemptChange(draft)}
          >
            Save
          </Button>
        )}
      </SplitWarning>
    </div>
  )
}
