/**
 * The condition rows inside a rule sheet: whatever `range` and `choice`
 * conditions the vocabulary declares are added one at a time via `+`, and
 * every active row ANDs together into the patch the sheet writes back --
 * a rule has always been the conjunction of its conditions, never a
 * choice of one. PvP is its own permanent block below the range rows
 * rather than a tenth thing you `+` in: 1.x asked for three independent
 * range widgets, one per league; the 2.0 schema holds one `pvpLeague` and
 * one rank range (`server/src/db/rules-schema.ts`), so the control that
 * matches it is a single radio group, always visible, picking which one
 * league the rank range below it means. The widening a rank above 1 needs
 * against Golbat's collapsed-rank lookup already lives in
 * `rules-to-golbat-filters.ts` and is never re-derived here -- this editor
 * only ever writes the rule's own declared bounds.
 *
 * The vocabulary is the same descriptor `describeWithVocabulary` reads
 * (`condition-vocabulary.ts`): this editor only knows how to draw two of
 * its five condition kinds -- `range` and `choice` -- which is every kind
 * a rule row's own columns need edited in place. The rest (`toggle`,
 * `text`, `count`, `value`) describe things this sheet either has its own
 * dedicated control for already (exclusions -> `SpeciesPicker`) or that
 * belong to a delivery tail no rule-row editor writes; a vocabulary is
 * free to declare them and this editor simply does not offer them in its
 * `+` menu.
 *
 * A vocabulary's `label` is written for `describeWithVocabulary`'s
 * mid-sentence use ("attack 10+", not "Attack 10+"), but a form control's
 * label is not mid-sentence -- so every label this editor shows is run
 * through `capitalize` at the point of rendering, rather than the
 * descriptor carrying a second, editor-specific casing of the same word.
 */

import { useMemo, useState } from 'react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group'
import type {
  ChoiceCondition,
  RangeCondition,
  Vocabulary,
} from './condition-vocabulary'
import { REACTMAP_VOCABULARY } from './condition-vocabulary'

export interface ConditionSeed {
  /** The vocabulary condition's key this seed feeds, e.g. 'iv', 'gender'. */
  type: string
  min?: number | null
  max?: number | null
  /** Choice conditions only, e.g. gender -- see `app/map/types.ts`: 0
   *  unset, 1 male, 2 female, 3 genderless. */
  value?: number | string | null
}

/**
 * What the editor emits: a field map keyed by whatever the vocabulary
 * declared -- `ivMin`/`ivMax` for ReactMap's own conditions, `weightMin`
 * or `ping` for Poracle's. This type never names `Rule`/`RulePatch` on
 * purpose: only a caller that knows which vocabulary it handed the editor
 * knows which schema the keys belong to, so narrowing to a concrete patch
 * type is that caller's job, not this component's.
 */
export type ConditionPatch = Record<string, number | string | null>

type FieldValues = ConditionPatch

interface EditorState {
  active: ReadonlySet<string>
  fields: FieldValues
}

/** "attack" -> "Attack". Already-capitalised words (`IV`, `CP`, `Little`) pass through unchanged. */
function capitalize(word: string): string {
  return word.length > 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word
}

function editableDefs(vocab: Vocabulary) {
  return vocab.conditions.filter(
    (def): def is RangeCondition | ChoiceCondition =>
      (def.kind === 'range' || def.kind === 'choice') && def.key !== 'pvp',
  )
}

function seedState(
  conditions: ConditionSeed[],
  vocab: Vocabulary,
): EditorState {
  const byKey = new Map(vocab.conditions.map((def) => [def.key, def]))
  const active = new Set<string>()
  const fields: FieldValues = {}
  for (const seed of conditions) {
    const def = byKey.get(seed.type)
    if (!def) continue
    active.add(seed.type)
    if (def.kind === 'choice') {
      fields[def.field] = seed.value ?? null
    } else if (def.kind === 'range') {
      if (seed.min != null) fields[def.minField] = seed.min
      if (seed.max != null) fields[def.maxField] = seed.max
    }
  }
  return { active, fields }
}

export interface ConditionEditorProps {
  /** Conditions already on the rule -- each becomes one active row, seeded with its value. */
  conditions?: ConditionSeed[]
  /** The schema this editor's rows are drawn from. Defaults to ReactMap's own `rule` columns. */
  vocabulary?: Vocabulary
  onChange?: (patch: ConditionPatch) => void
}

export function ConditionEditor({
  conditions = [],
  vocabulary = REACTMAP_VOCABULARY,
  onChange,
}: ConditionEditorProps) {
  const byKey = useMemo(
    () => new Map(vocabulary.conditions.map((def) => [def.key, def])),
    [vocabulary],
  )
  const [{ active, fields }, setState] = useState<EditorState>(() =>
    seedState(conditions, vocabulary),
  )
  const [menuOpen, setMenuOpen] = useState(false)

  const addableDefs = editableDefs(vocabulary).filter(
    (def) => !active.has(def.key),
  )
  const activeRanges = [...active]
    .map((key) => byKey.get(key))
    .filter(
      (def): def is RangeCondition =>
        def?.kind === 'range' && def.key !== 'pvp',
    )
  const activeChoices = [...active]
    .map((key) => byKey.get(key))
    .filter((def): def is ChoiceCondition => def?.kind === 'choice')
  const pvpDef = vocabulary.conditions.find(
    (def): def is RangeCondition => def.kind === 'range' && def.key === 'pvp',
  )

  function commit(nextActive: ReadonlySet<string>, nextFields: FieldValues) {
    setState({ active: nextActive, fields: nextFields })
    onChange?.(nextFields)
  }

  function addCondition(key: string) {
    const def = byKey.get(key)
    if (!def) return
    const nextActive = new Set(active)
    nextActive.add(key)
    const nextFields: FieldValues = { ...fields }
    if (def.kind === 'choice') {
      // A starting value the user immediately edits -- not a guess at
      // what they meant, just something other than "unset" to edit from.
      nextFields[def.field] = def.options[0]?.value ?? null
    } else if (def.kind === 'range') {
      nextFields[def.minField] = 0
    }
    setMenuOpen(false)
    commit(nextActive, nextFields)
  }

  function updateRange(def: RangeCondition, bound: 'min' | 'max', raw: string) {
    const value = raw === '' ? null : Number(raw)
    commit(active, {
      ...fields,
      [bound === 'min' ? def.minField : def.maxField]: value,
    })
  }

  function updateChoice(def: ChoiceCondition, value: string) {
    const option = def.options.find((o) => String(o.value) === value)
    commit(active, { ...fields, [def.field]: option?.value ?? value })
  }

  function updatePvpLeague(def: RangeCondition, cap: number) {
    if (!def.labelField) return
    commit(active, { ...fields, [def.labelField]: cap })
  }

  function updatePvpRank(
    def: RangeCondition,
    bound: 'min' | 'max',
    raw: string,
  ) {
    updateRange(def, bound, raw)
  }

  return (
    <div className="flex flex-col gap-3">
      {activeRanges.map((def) => (
        <div key={def.key} className="flex items-center gap-2">
          <span className="w-16 text-sm text-muted-foreground">
            {capitalize(def.label)}
          </span>
          <Input
            type="number"
            aria-label={`${capitalize(def.label)} minimum`}
            value={(fields[def.minField] as number | null | undefined) ?? ''}
            onChange={(event) => updateRange(def, 'min', event.target.value)}
          />
          <Input
            type="number"
            aria-label={`${capitalize(def.label)} maximum`}
            value={(fields[def.maxField] as number | null | undefined) ?? ''}
            onChange={(event) => updateRange(def, 'max', event.target.value)}
          />
        </div>
      ))}

      {activeChoices.map((def) => (
        <div key={def.key} className="flex items-center gap-2">
          <span className="w-16 text-sm text-muted-foreground">
            {capitalize(def.label)}
          </span>
          <RadioGroup
            className="flex flex-row gap-3"
            value={String(fields[def.field] ?? def.options[0]?.value ?? '')}
            onValueChange={(value) => updateChoice(def, value)}
          >
            {def.options.map((option) => (
              <span
                key={option.value}
                className="flex items-center gap-1.5 text-sm"
              >
                <RadioGroupItem
                  id={`${def.key}-${option.value}`}
                  value={String(option.value)}
                />
                <label htmlFor={`${def.key}-${option.value}`}>
                  {capitalize(option.label)}
                </label>
              </span>
            ))}
          </RadioGroup>
        </div>
      ))}

      <div className="relative">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setMenuOpen((o) => !o)}
        >
          +
        </Button>
        {menuOpen && (
          <div
            role="listbox"
            aria-label="Add condition"
            className="absolute z-10 mt-1 flex flex-col rounded-lg border border-border bg-popover p-1 shadow-md"
          >
            {addableDefs.map((def) => (
              <button
                key={def.key}
                type="button"
                role="option"
                aria-selected={false}
                className="rounded-md px-2 py-1 text-left text-sm hover:bg-muted"
                onClick={() => addCondition(def.key)}
              >
                {capitalize(def.label)}
              </button>
            ))}
          </div>
        )}
      </div>

      {pvpDef?.labelField && (
        <div className="flex flex-col gap-2 border-t border-border pt-3">
          <span className="text-sm text-muted-foreground">PvP league</span>
          <RadioGroup
            className="flex flex-row gap-3"
            value={
              fields[pvpDef.labelField] != null
                ? String(fields[pvpDef.labelField])
                : null
            }
            onValueChange={(value) => updatePvpLeague(pvpDef, Number(value))}
          >
            {Object.entries(pvpDef.labelWords ?? {}).map(([cap, label]) => (
              <span key={cap} className="flex items-center gap-1.5 text-sm">
                <RadioGroupItem id={`pvp-league-${cap}`} value={cap} />
                <label htmlFor={`pvp-league-${cap}`}>{capitalize(label)}</label>
              </span>
            ))}
          </RadioGroup>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              aria-label="PvP rank minimum"
              value={
                (fields[pvpDef.minField] as number | null | undefined) ?? ''
              }
              onChange={(event) =>
                updatePvpRank(pvpDef, 'min', event.target.value)
              }
            />
            <Input
              type="number"
              aria-label="PvP rank maximum"
              value={
                (fields[pvpDef.maxField] as number | null | undefined) ?? ''
              }
              onChange={(event) =>
                updatePvpRank(pvpDef, 'max', event.target.value)
              }
            />
          </div>
        </div>
      )}
    </div>
  )
}
