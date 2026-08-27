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
import {
  describeWithVocabulary,
  REACTMAP_VOCABULARY,
} from './condition-vocabulary'
import { conditionSeeds } from './rule-conditions'
import { RuleSheet } from './rule-sheet'
import type { RuleGroup } from './rule-types'
import type { RulePatch } from './rules-query'
import { SpeciesHeader } from './species-header'
import type { SpeciesEntry, SpeciesSelection } from './species-picker'
import { SpeciesPicker } from './species-picker'
import { SplitWarning } from './split-warning'
import type { NamesLookup } from './use-names'

/** The whole group, rather than one of its members. */
const EVERY_MEMBER = 'all'

/** Which side of the species question the one list is answering. */
type SubjectMode = 'only' | 'except'

export interface RuleEditorProps {
  group: RuleGroup
  names: NamesLookup
  /** The species catalog the exclusion picker draws from. */
  species?: SpeciesEntry[]
  onCommit: (ruleIds: number[], patch: RulePatch) => void
  /**
   * A draft that has not been written yet, so Save creates rather than
   * updates and the escape is discarding rather than leaving a rule behind.
   * The starting points are deliberately broad, and the blank one matches
   * every Pokemon, so writing one before anyone has narrowed it puts a rule
   * on the map nobody chose.
   */
  isNew?: boolean
  onDiscard?: () => void
  /**
   * The species a NEW rule will be written for. `[null]` is "Any Pokémon".
   *
   * Draft-only, and deliberately: one row per species means changing a
   * written rule's subject is creating and deleting rows, which
   * `rules.update` cannot express -- it patches columns on the ids it is
   * given. So the subject is settled once, here, before anything exists.
   */
  subjectIds?: (number | null)[]
  onSubjectChange?: (speciesIds: (number | null)[]) => void
}

/** The wire carries species ids only, so a form choice collapses to its
 *  species -- same as `RuleSheet` does for exclusions. */
function toSpeciesIds(selection: SpeciesSelection[]): number[] {
  const ids = selection.map((entry) =>
    typeof entry === 'number' ? entry : entry.speciesId,
  )
  return [...new Set(ids)]
}

function labelFor(speciesId: number | null, names: NamesLookup): string {
  return speciesId === null ? 'Any Pokémon' : names.species(speciesId)
}

export function RuleEditor({
  group,
  names,
  species = [],
  onCommit,
  isNew = false,
  onDiscard,
  subjectIds,
  onSubjectChange,
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

  // "Only these" and "all except" are two answers to the same question --
  // which Pokémon does this rule concern -- so they share one list and a
  // mode, rather than sitting in two identical pickers stacked up.
  const [subjectMode, setSubjectMode] = useState<SubjectMode>('only')

  // The draft's subject as the picker wants it: `[null]` means nothing is
  // selected and the rule is about every Pokémon.
  const pickedSpecies = (subjectIds ?? []).filter(
    (id): id is number => id !== null,
  )
  const subjectIsAnyPokemon = pickedSpecies.length === 0
  const draftExclusions = draft.exclusions ?? group.sample.exclusions ?? []
  const subjectSelection =
    subjectMode === 'only' ? pickedSpecies : draftExclusions

  /** Switching mode moves the list to the other side, and takes nothing
   *  with it: species to match and species to skip are opposite claims. */
  function changeMode(next: SubjectMode) {
    setSubjectMode(next)
    onSubjectChange?.([null])
    setDraft((current) => ({ ...current, exclusions: [] }))
  }

  function changeSubject(selection: SpeciesSelection[]) {
    const ids = toSpeciesIds(selection)
    if (subjectMode === 'only') {
      onSubjectChange?.(ids.length > 0 ? ids : [null])
      return
    }
    // An "all except" rule stays about every Pokémon; the species picked
    // are the ones it skips, which is a column on that one row.
    onSubjectChange?.([null])
    setDraft((current) => ({ ...current, exclusions: ids }))
  }

  // Who this sheet is about, when that is one subject. Selecting a member
  // names it; a whole group of several does not have one subject to show,
  // and the list beside it already names each member. A draft has no
  // members yet, so its subject is whatever the picker currently holds.
  const subjectId = onSubjectChange
    ? subjectMode === 'except' || subjectIsAnyPokemon
      ? null
      : pickedSpecies.length === 1
        ? (pickedSpecies[0] ?? null)
        : undefined
    : editingOneMember
      ? (group.speciesIds[targetIndex] ?? null)
      : group.ruleIds.length === 1
        ? group.sample.speciesId
        : undefined

  // The sentence the card would read if this were saved now, so the effect
  // of a change is visible without closing the sheet to go and look.
  const sentence = describeWithVocabulary(
    { ...group.sample, ...draft },
    REACTMAP_VOCABULARY,
  )

  return (
    <div className="flex flex-col gap-4">
      {subjectId !== undefined && (
        <SpeciesHeader
          speciesId={subjectId}
          names={names}
          sentence={sentence}
        />
      )}

      {/*
        Which Pokémon the rule is about, first, because it is the question
        the rest of the sheet is answering ABOUT something -- a condition
        means nothing until you know what it narrows. It appears only on a
        draft: a written rule is one row per species, so changing its
        subject means creating and deleting rows rather than patching
        columns, which is not what Save does here.
      */}
      {onSubjectChange && (
        <div data-testid="rule-subject" className="flex flex-col gap-2">
          <p
            id="rule-subject-label"
            className="text-sm font-medium text-foreground"
          >
            Pokémon
          </p>
          <RadioGroup
            aria-labelledby="rule-subject-label"
            className="flex flex-row gap-3"
            value={subjectMode}
            onValueChange={(value) => changeMode(value as SubjectMode)}
          >
            <span className="flex items-center gap-1.5 text-sm">
              <RadioGroupItem id="subject-only" value="only" />
              <label htmlFor="subject-only">Only these</label>
            </span>
            <span className="flex items-center gap-1.5 text-sm">
              <RadioGroupItem id="subject-except" value="except" />
              <label htmlFor="subject-except">Every Pokémon except</label>
            </span>
          </RadioGroup>
          <p className="text-xs text-muted-foreground">
            {subjectSelection.length === 0
              ? 'Nothing picked, so this matches every Pokémon.'
              : subjectMode === 'only'
                ? `Matches ${subjectSelection.length} of them, and nothing else.`
                : `Matches everything but these ${subjectSelection.length}.`}
          </p>
          <SpeciesPicker
            species={species}
            selected={subjectSelection}
            onChange={changeSubject}
          />
        </div>
      )}
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
        enabled={draft.enabled ?? group.sample.enabled}
        species={species}
        exclusions={group.sample.exclusions}
        conditions={conditionSeeds(group.sample)}
        {...(onSubjectChange ? { showExclusions: false } : {})}
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
          <div className="flex items-center gap-2 self-start">
            {isNew && onDiscard && (
              <Button type="button" variant="outline" onClick={onDiscard}>
                Discard
              </Button>
            )}
            <Button type="button" onClick={() => attemptChange(draft)}>
              Save
            </Button>
          </div>
        )}
      </SplitWarning>
    </div>
  )
}
